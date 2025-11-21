import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMediaThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaThumbnail";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test administrator workflow for deleting thumbnails from media files.
 *
 * This comprehensive E2E test validates the complete thumbnail management
 * lifecycle:
 *
 * 1. Administrator registration with appropriate privileges
 * 2. Member registration to upload media files
 * 3. Media file upload by member
 * 4. Thumbnail creation for the uploaded media file
 * 5. Administrator authentication for thumbnail management
 * 6. Thumbnail deletion using administrative privileges
 * 7. Validation of successful deletion and proper cleanup
 */
export async function test_api_admin_media_file_thumbnail_deletion(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "content_manager",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Member uploads media file
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

  // 4. Member creates thumbnail for the media file
  const createdThumbnail: ICommunityPlatformMediaThumbnail =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.create(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          thumbnail_size: "150x150",
          storage_path: "/uploads/thumbnails/test-image-150x150.jpg",
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
  typia.assert(createdThumbnail);

  // 5. Switch to admin authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "SecurePassword123!",
      ip: "192.168.1.1",
      href: "https://example.com/login",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Mozilla/5.0 (Test Browser)",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 6. Admin deletes the thumbnail
  const deletedThumbnail: ICommunityPlatformMediaThumbnail =
    await api.functional.communityPlatform.admin.mediaFiles.thumbnails.erase(
      connection,
      {
        mediaFileId: mediaFile.id,
        thumbnailId: createdThumbnail.id,
      },
    );
  typia.assert(deletedThumbnail);

  // 7. Validate deletion was successful
  TestValidator.equals(
    "deleted thumbnail ID matches original thumbnail ID",
    deletedThumbnail.id,
    createdThumbnail.id,
  );
  TestValidator.equals(
    "deleted thumbnail media file ID matches original media file ID",
    deletedThumbnail.community_platform_media_file_id,
    mediaFile.id,
  );
  TestValidator.equals(
    "deleted thumbnail storage path matches original thumbnail storage path",
    deletedThumbnail.storage_path,
    createdThumbnail.storage_path,
  );
  TestValidator.equals(
    "deleted thumbnail dimensions match original thumbnail dimensions",
    deletedThumbnail.thumbnail_size,
    createdThumbnail.thumbnail_size,
  );
}
