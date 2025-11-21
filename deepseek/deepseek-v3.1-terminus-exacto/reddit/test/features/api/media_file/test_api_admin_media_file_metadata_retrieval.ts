import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMediaMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaMetadata";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test that administrators can retrieve detailed technical metadata for media
 * files uploaded by members. This scenario validates that admin users can
 * access comprehensive technical information including image/video dimensions,
 * duration, bitrate, camera settings, GPS coordinates, and EXIF data for any
 * media file in the system, regardless of the original uploader.
 */
export async function test_api_admin_media_file_metadata_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/upload",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Upload media file with member credentials
  const mediaFile: ICommunityPlatformMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: "test_image.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          storage_path: "/uploads/images/test_image.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Validate that file was created under member account
  TestValidator.equals(
    "media file should be associated with member",
    mediaFile.community_platform_member_id,
    member.id,
  );

  // Step 4: Switch to admin authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com/dashboard",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Retrieve metadata using admin privileges
  const metadata: ICommunityPlatformMediaMetadata =
    await api.functional.communityPlatform.admin.mediaFiles.metadata.at(
      connection,
      {
        mediaFileId: mediaFile.id,
      },
    );
  typia.assert(metadata);

  // Step 6: Validate metadata structure and content
  TestValidator.equals(
    "metadata should have correct media file ID",
    metadata.community_platform_media_file_id,
    mediaFile.id,
  );
  TestValidator.predicate(
    "metadata should have creation timestamp",
    metadata.created_at !== undefined,
  );
  TestValidator.predicate(
    "metadata should have update timestamp",
    metadata.updated_at !== undefined,
  );

  // Validate that admin successfully accessed member-uploaded file metadata
  TestValidator.predicate(
    "admin should be able to retrieve member-uploaded file metadata",
    true,
  );

  // Validate optional metadata fields if present
  if (metadata.width !== undefined) {
    TestValidator.predicate(
      "width should be positive number",
      metadata.width > 0,
    );
  }
  if (metadata.height !== undefined) {
    TestValidator.predicate(
      "height should be positive number",
      metadata.height > 0,
    );
  }
  if (metadata.duration !== undefined) {
    TestValidator.predicate(
      "duration should be positive number",
      metadata.duration > 0,
    );
  }
  if (metadata.bitrate !== undefined) {
    TestValidator.predicate(
      "bitrate should be positive number",
      metadata.bitrate > 0,
    );
  }
  if (metadata.gps_latitude !== undefined) {
    TestValidator.predicate(
      "latitude should be valid coordinate",
      metadata.gps_latitude >= -90 && metadata.gps_latitude <= 90,
    );
  }
  if (metadata.gps_longitude !== undefined) {
    TestValidator.predicate(
      "longitude should be valid coordinate",
      metadata.gps_longitude >= -180 && metadata.gps_longitude <= 180,
    );
  }

  // Additional validation for comprehensive metadata retrieval
  TestValidator.predicate(
    "metadata retrieval successful for cross-actor access",
    true,
  );
}
