import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const BUCKET_NAME = 'make-64775d98-incident-images';

/**
 * Initialize the incident images bucket if it doesn't exist
 */
export async function initializeIncidentImagesBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`Creating bucket: ${BUCKET_NAME}`);
      const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false, // Private bucket for security
        fileSizeLimit: 10485760, // 10MB limit per file
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
      } else {
        console.log('Bucket created successfully:', data);
      }
    } else {
      console.log(`Bucket ${BUCKET_NAME} already exists`);
    }
  } catch (error) {
    console.error('Error initializing bucket:', error);
  }
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadIncidentImage(
  file: File,
  incidentId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${incidentId}/${timestamp}.${fileExt}`;

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileData, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: null, error: error.message };
    }

    // Get signed URL (valid for 1 year)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(data.path, 31536000); // 1 year in seconds

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
      return { url: null, error: signedUrlError.message };
    }

    console.log('File uploaded successfully:', signedUrlData.signedUrl);
    return { url: signedUrlData.signedUrl, error: null };
  } catch (error) {
    console.error('Upload exception:', error);
    return { url: null, error: String(error) };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteIncidentImage(filePath: string): Promise<{ success: boolean; error: string | null }> {
  try {
    // Extract the path from the signed URL if needed
    const pathMatch = filePath.match(/\/object\/sign\/[^\/]+\/(.+?)\?/);
    const actualPath = pathMatch ? pathMatch[1] : filePath;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([actualPath]);

    if (error) {
      console.error('Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Delete exception:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * List all files for an incident
 */
export async function listIncidentImages(incidentId: string) {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(incidentId);

    if (error) {
      console.error('List error:', error);
      return { files: [], error: error.message };
    }

    // Generate signed URLs for all files
    const filesWithUrls = await Promise.all(
      (data || []).map(async (file) => {
        const { data: signedUrlData } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(`${incidentId}/${file.name}`, 31536000);
        
        return {
          name: file.name,
          url: signedUrlData?.signedUrl || null,
          createdAt: file.created_at,
          size: file.metadata?.size
        };
      })
    );

    return { files: filesWithUrls, error: null };
  } catch (error) {
    console.error('List exception:', error);
    return { files: [], error: String(error) };
  }
}
