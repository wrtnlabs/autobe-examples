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
 * Test that administrators can retrieve detailed thumbnail information for
 * media files uploaded by members. Validates that admin users can access
 * thumbnail metadata including dimensions, storage path, file size, quality
 * settings, and format specifications. Tests proper authorization checks and
 * ensures that thumbnail retrieval includes comprehensive technical details
 * needed for administrative oversight and troubleshooting.
 */
export async function test_api_admin_thumbnail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "memberPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Upload media file as member
  const mediaFile =
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

  // Step 3: Generate thumbnail for the media file
  const thumbnailSize = "150x150";
  const thumbnailStoragePath = `/thumbnails/test-image-${thumbnailSize}.jpg`;

  const thumbnail =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.create(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          thumbnail_size: thumbnailSize,
          storage_path: thumbnailStoragePath,
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
  typia.assert(thumbnail);

  // Step 4: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPassword123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "content",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 5: Login as admin to establish admin authentication context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Mozilla/5.0 (Test Agent)",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 6: Retrieve thumbnail details using admin privileges
  const retrievedThumbnail =
    await api.functional.communityPlatform.admin.mediaFiles.thumbnails.at(
      connection,
      {
        mediaFileId: mediaFile.id,
        thumbnailId: thumbnail.id,
      },
    );
  typia.assert(retrievedThumbnail);

  // Step 7: Validate thumbnail metadata
  TestValidator.equals(
    "thumbnail ID matches",
    retrievedThumbnail.id,
    thumbnail.id,
  );
  TestValidator.equals(
    "thumbnail size matches",
    retrievedThumbnail.thumbnail_size,
    thumbnailSize,
  );
  TestValidator.equals(
    "storage path matches",
    retrievedThumbnail.storage_path,
    thumbnailStoragePath,
  );
  TestValidator.equals(
    "file size is positive",
    retrievedThumbnail.file_size > 0,
    true,
  );
  TestValidator.predicate(
    "quality is within range",
    retrievedThumbnail.quality >= 1 && retrievedThumbnail.quality <= 100,
  );
  TestValidator.equals("format matches", retrievedThumbnail.format, "JPEG");
  TestValidator.equals(
    "media file ID matches",
    retrievedThumbnail.community_platform_media_file_id,
    mediaFile.id,
  );
  TestValidator.equals(
    "parent media file ID matches",
    retrievedThumbnail.media_file.id,
    mediaFile.id,
  );

  // Step 8: Test authorization - member should not be able to access admin endpoint
  // Switch back to member authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/member",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Attempt to access admin endpoint as member should fail
  await TestValidator.error(
    "member cannot access admin thumbnail endpoint",
    async () => {
      await api.functional.communityPlatform.admin.mediaFiles.thumbnails.at(
        connection,
        {
          mediaFileId: mediaFile.id,
          thumbnailId: thumbnail.id,
        },
      );
    },
  );
}
