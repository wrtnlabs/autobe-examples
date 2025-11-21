import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMediaThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaThumbnail";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test that authenticated members can generate thumbnails for their uploaded
 * media files.
 *
 * This test validates the complete thumbnail creation workflow including member
 * authentication, media file upload, and thumbnail generation with specific
 * dimensions, format, and quality settings. The test ensures thumbnails are
 * properly linked to parent media files and that the generation process
 * completes successfully with appropriate metadata tracking.
 *
 * Workflow:
 *
 * 1. Create member account for authentication
 * 2. Upload media file that will have thumbnails generated
 * 3. Generate thumbnail with specific dimensions, format, and quality settings
 * 4. Validate thumbnail is properly linked to media file
 * 5. Verify thumbnail metadata including size, format, and storage path
 */
export async function test_api_member_thumbnail_generation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Upload media file that will have thumbnails generated
  const mediaFile: ICommunityPlatformMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: "test-image.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          storage_path: "/uploads/images/test-image.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Step 3: Generate thumbnail with specific dimensions, format, and quality settings
  const thumbnail: ICommunityPlatformMediaThumbnail =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.create(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          thumbnail_size: "150x150",
          storage_path: "/uploads/thumbnails/test-image-150x150.jpg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<100> &
              tags.Maximum<50000>
          >(),
          quality: 85,
          format: "JPEG",
          community_platform_media_file_id: mediaFile.id,
        } satisfies ICommunityPlatformMediaThumbnail.ICreate,
      },
    );
  typia.assert(thumbnail);

  // Step 4: Validate thumbnail is properly linked to media file
  TestValidator.equals(
    "thumbnail should be linked to correct media file",
    thumbnail.community_platform_media_file_id,
    mediaFile.id,
  );
  TestValidator.equals(
    "thumbnail media_file.id should match parent media file",
    thumbnail.media_file.id,
    mediaFile.id,
  );

  // Step 5: Verify thumbnail metadata
  TestValidator.equals(
    "thumbnail size should match requested 150x150 dimensions",
    thumbnail.thumbnail_size,
    "150x150",
  );
  TestValidator.equals(
    "thumbnail format should match requested JPEG format",
    thumbnail.format,
    "JPEG",
  );
  TestValidator.equals(
    "thumbnail quality should match requested 85 quality",
    thumbnail.quality,
    85,
  );
  TestValidator.predicate(
    "thumbnail file size should be positive",
    thumbnail.file_size > 0,
  );
  TestValidator.predicate(
    "thumbnail should have valid creation timestamp",
    thumbnail.created_at !== null &&
      thumbnail.created_at !== undefined &&
      thumbnail.created_at.length > 0,
  );
}
