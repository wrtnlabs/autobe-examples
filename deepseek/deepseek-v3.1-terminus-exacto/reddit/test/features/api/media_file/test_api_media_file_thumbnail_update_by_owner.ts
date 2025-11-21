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
 * Test complete workflow for updating a thumbnail owned by the authenticated
 * member.
 *
 * This E2E test validates the entire thumbnail update process including member
 * registration, media file upload, initial thumbnail creation, and thumbnail
 * property updates. The test ensures that thumbnail updates maintain proper
 * ownership relationships and trigger appropriate processing workflows.
 */
export async function test_api_media_file_thumbnail_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Upload media file that will serve as parent for thumbnail
  const mediaFile: ICommunityPlatformMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: "test-image.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          storage_path: "/uploads/images/test-image.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Step 3: Create initial thumbnail
  const initialThumbnail: ICommunityPlatformMediaThumbnail =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.create(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          thumbnail_size: "150x150",
          storage_path: "/thumbnails/images/test-image-150x150.jpg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          quality: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          format: "JPEG",
          community_platform_media_file_id: mediaFile.id,
        } satisfies ICommunityPlatformMediaThumbnail.ICreate,
      },
    );
  typia.assert(initialThumbnail);

  // Step 4: Update thumbnail properties
  const updatedThumbnail: ICommunityPlatformMediaThumbnail =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.update(
      connection,
      {
        mediaFileId: mediaFile.id,
        thumbnailId: initialThumbnail.id,
        body: {
          thumbnail_size: "300x300",
          quality: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          format: "PNG",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies ICommunityPlatformMediaThumbnail.IUpdate,
      },
    );
  typia.assert(updatedThumbnail);

  // Step 5: Validate that thumbnail was updated correctly
  TestValidator.equals(
    "thumbnail ID remains the same",
    updatedThumbnail.id,
    initialThumbnail.id,
  );
  TestValidator.equals(
    "parent media file ID remains the same",
    updatedThumbnail.community_platform_media_file_id,
    mediaFile.id,
  );
  TestValidator.notEquals(
    "thumbnail size was updated",
    updatedThumbnail.thumbnail_size,
    initialThumbnail.thumbnail_size,
  );
  TestValidator.equals(
    "thumbnail size matches update request",
    updatedThumbnail.thumbnail_size,
    "300x300",
  );
  TestValidator.notEquals(
    "quality was updated",
    updatedThumbnail.quality,
    initialThumbnail.quality,
  );
  TestValidator.notEquals(
    "format was updated",
    updatedThumbnail.format,
    initialThumbnail.format,
  );
  TestValidator.equals(
    "format matches update request",
    updatedThumbnail.format,
    "PNG",
  );

  // Validate parent relationship
  TestValidator.equals(
    "parent media file relationship maintained",
    updatedThumbnail.media_file.id,
    mediaFile.id,
  );
}
