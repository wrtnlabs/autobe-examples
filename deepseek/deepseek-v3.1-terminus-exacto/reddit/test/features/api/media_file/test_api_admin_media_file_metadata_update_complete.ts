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
 * Comprehensive metadata update workflow for media files.
 *
 * This test validates the complete metadata management workflow where an admin
 * updates technical metadata for a media file uploaded by a member. The test
 * covers cross-actor authentication, file upload, metadata extraction, and
 * technical field validation for media optimization workflows.
 */
export async function test_api_admin_media_file_metadata_update_complete(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account to upload media file
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://example.com/upload",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Upload media file that will have metadata updated
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

  // Step 4: Switch to admin authentication
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://example.com/admin",
        referrer: "https://example.com",
        session_id: typia.random<string & tags.Format<"uuid">>(),
        user_agent: "Test Agent",
      } satisfies ICommunityPlatformAdmin.ILogin,
    });
  typia.assert(adminAuth);

  // Step 5: Update media file metadata with comprehensive technical information
  const updatedMetadata: ICommunityPlatformMediaMetadata =
    await api.functional.communityPlatform.admin.mediaFiles.metadata.update(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          width: typia.random<number & tags.Type<"int32">>(),
          height: typia.random<number & tags.Type<"int32">>(),
          duration: typia.random<number & tags.Type<"int32">>(),
          bitrate: typia.random<number & tags.Type<"int32">>(),
          color_space: "sRGB",
          camera_model: "Canon EOS R5",
          gps_latitude: typia.random<number>(),
          gps_longitude: typia.random<number>(),
          exif_data: JSON.stringify({
            make: "Canon",
            model: "EOS R5",
            exposure_time: "1/250",
            f_number: "f/2.8",
            iso: 100,
            focal_length: "50mm",
          }),
        } satisfies ICommunityPlatformMediaMetadata.IUpdate,
      },
    );
  typia.assert(updatedMetadata);

  // Step 6: Validate that metadata updates are properly applied
  TestValidator.equals(
    "metadata ID matches media file ID",
    updatedMetadata.community_platform_media_file_id,
    mediaFile.id,
  );
  TestValidator.predicate(
    "width should be set",
    updatedMetadata.width !== undefined,
  );
  TestValidator.predicate(
    "height should be set",
    updatedMetadata.height !== undefined,
  );
  TestValidator.predicate(
    "camera model should be set",
    updatedMetadata.camera_model !== undefined,
  );
  TestValidator.predicate(
    "GPS coordinates should be set",
    updatedMetadata.gps_latitude !== undefined &&
      updatedMetadata.gps_longitude !== undefined,
  );
  TestValidator.predicate(
    "EXIF data should be set",
    updatedMetadata.exif_data !== undefined,
  );

  // Validate technical field constraints
  if (
    updatedMetadata.width !== undefined &&
    updatedMetadata.height !== undefined
  ) {
    TestValidator.predicate(
      "dimensions should be positive",
      updatedMetadata.width > 0 && updatedMetadata.height > 0,
    );
  }

  if (updatedMetadata.duration !== undefined) {
    TestValidator.predicate(
      "duration should be non-negative",
      updatedMetadata.duration >= 0,
    );
  }

  if (updatedMetadata.bitrate !== undefined) {
    TestValidator.predicate(
      "bitrate should be positive",
      updatedMetadata.bitrate > 0,
    );
  }

  // Validate EXIF data structure
  if (updatedMetadata.exif_data !== undefined) {
    const exifData = JSON.parse(updatedMetadata.exif_data);
    TestValidator.predicate(
      "EXIF data should be valid JSON",
      typeof exifData === "object",
    );
    TestValidator.predicate(
      "EXIF data should contain camera information",
      exifData.make !== undefined && exifData.model !== undefined,
    );
  }
}
