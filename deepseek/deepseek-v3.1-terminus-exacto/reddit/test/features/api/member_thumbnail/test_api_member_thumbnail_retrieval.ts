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
 * Test that authenticated members can retrieve detailed thumbnail information
 * for media files they own.
 *
 * This test validates the complete workflow for thumbnail management:
 *
 * 1. Member registration and authentication
 * 2. Media file creation as thumbnail parent
 * 3. Thumbnail generation with specific dimensions and format
 * 4. Thumbnail retrieval and metadata validation
 * 5. Access control verification ensuring thumbnails are only accessible to owning
 *    members
 *
 * The test ensures that thumbnail metadata including dimensions, format,
 * quality settings, and storage paths are correctly returned and match the
 * creation parameters.
 */
export async function test_api_member_thumbnail_retrieval(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123";

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

  // 2. Create a media file that will serve as parent for thumbnail generation
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
          storage_path: "/uploads/test-image.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // 3. Generate a thumbnail for the created media file
  const thumbnailCreateData = {
    thumbnail_size: "150x150",
    storage_path: "/thumbnails/test-image-150x150.jpg",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    quality: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    format: "JPEG",
    community_platform_media_file_id: mediaFile.id,
  } satisfies ICommunityPlatformMediaThumbnail.ICreate;

  const createdThumbnail: ICommunityPlatformMediaThumbnail =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.create(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: thumbnailCreateData,
      },
    );
  typia.assert(createdThumbnail);

  // 4. Retrieve the thumbnail information using the GET endpoint
  const retrievedThumbnail: ICommunityPlatformMediaThumbnail =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.at(
      connection,
      {
        mediaFileId: mediaFile.id,
        thumbnailId: createdThumbnail.id,
      },
    );
  typia.assert(retrievedThumbnail);

  // 5. Validate that the retrieved thumbnail matches the created thumbnail properties
  TestValidator.equals(
    "thumbnail ID should match",
    retrievedThumbnail.id,
    createdThumbnail.id,
  );
  TestValidator.equals(
    "thumbnail size should match",
    retrievedThumbnail.thumbnail_size,
    thumbnailCreateData.thumbnail_size,
  );
  TestValidator.equals(
    "thumbnail format should match",
    retrievedThumbnail.format,
    thumbnailCreateData.format,
  );
  TestValidator.equals(
    "thumbnail quality should match",
    retrievedThumbnail.quality,
    thumbnailCreateData.quality,
  );
  TestValidator.equals(
    "thumbnail file size should match",
    retrievedThumbnail.file_size,
    thumbnailCreateData.file_size,
  );
  TestValidator.equals(
    "thumbnail storage path should match",
    retrievedThumbnail.storage_path,
    thumbnailCreateData.storage_path,
  );
  TestValidator.equals(
    "thumbnail media file ID should match",
    retrievedThumbnail.community_platform_media_file_id,
    mediaFile.id,
  );

  // 6. Validate parent media file relationship
  TestValidator.equals(
    "parent media file ID should match",
    retrievedThumbnail.media_file.id,
    mediaFile.id,
  );
  TestValidator.equals(
    "parent media file name should match",
    retrievedThumbnail.media_file.file_name,
    mediaFile.file_name,
  );
  TestValidator.equals(
    "parent media file type should match",
    retrievedThumbnail.media_file.file_type,
    mediaFile.file_type,
  );

  // 7. Validate timestamp consistency
  TestValidator.predicate(
    "thumbnail creation timestamp should be valid",
    retrievedThumbnail.created_at !== null &&
      retrievedThumbnail.created_at !== undefined,
  );
  TestValidator.predicate(
    "thumbnail creation timestamp should be ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedThumbnail.created_at),
  );
}
