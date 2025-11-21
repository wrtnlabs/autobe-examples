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
 * Test partial metadata update scenario where admin updates only specific
 * technical fields without requiring complete metadata replacement. Validates
 * selective field updates for dimensions, camera model, or GPS coordinates
 * while preserving unchanged metadata fields. Tests the flexibility of metadata
 * management for targeted technical corrections.
 */
export async function test_api_admin_media_file_metadata_partial_update(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
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

  // Step 2: Upload media file that will receive metadata updates
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

  // Step 3: Create admin account for administrative access
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

  // Step 4: Switch to admin authentication context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.1",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Perform partial metadata update targeting specific fields
  const partialUpdateData = {
    width: typia.random<number & tags.Type<"int32">>(),
    height: typia.random<number & tags.Type<"int32">>(),
    camera_model: "Test Camera Model",
    gps_latitude: typia.random<number>(),
    gps_longitude: typia.random<number>(),
  } satisfies ICommunityPlatformMediaMetadata.IUpdate;

  const updatedMetadata =
    await api.functional.communityPlatform.admin.mediaFiles.metadata.update(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: partialUpdateData,
      },
    );
  typia.assert(updatedMetadata);

  // Step 6: Verify that only the targeted fields are updated
  TestValidator.equals(
    "width should be updated",
    updatedMetadata.width,
    partialUpdateData.width,
  );
  TestValidator.equals(
    "height should be updated",
    updatedMetadata.height,
    partialUpdateData.height,
  );
  TestValidator.equals(
    "camera model should be updated",
    updatedMetadata.camera_model,
    partialUpdateData.camera_model,
  );
  TestValidator.equals(
    "GPS latitude should be updated",
    updatedMetadata.gps_latitude,
    partialUpdateData.gps_latitude,
  );
  TestValidator.equals(
    "GPS longitude should be updated",
    updatedMetadata.gps_longitude,
    partialUpdateData.gps_longitude,
  );

  // Step 7: Validate that the update operation returns the correct metadata structure
  TestValidator.predicate(
    "metadata should have ID",
    updatedMetadata.id !== undefined,
  );
  TestValidator.predicate(
    "metadata should reference media file",
    updatedMetadata.community_platform_media_file_id === mediaFile.id,
  );
  TestValidator.predicate(
    "metadata should have creation timestamp",
    updatedMetadata.created_at !== undefined,
  );
  TestValidator.predicate(
    "metadata should have update timestamp",
    updatedMetadata.updated_at !== undefined,
  );

  // Step 8: Test error scenario - non-admin should not be able to update metadata
  // Switch back to member account
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/member",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Attempt metadata update as member (should fail)
  await TestValidator.error(
    "member should not be able to update metadata",
    async () => {
      await api.functional.communityPlatform.admin.mediaFiles.metadata.update(
        connection,
        {
          mediaFileId: mediaFile.id,
          body: {
            width: 100,
          } satisfies ICommunityPlatformMediaMetadata.IUpdate,
        },
      );
    },
  );

  // Step 9: Test partial update with only one field
  // Switch back to admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.1",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Update only the camera model
  const singleFieldUpdate = {
    camera_model: "Updated Camera Model",
  } satisfies ICommunityPlatformMediaMetadata.IUpdate;

  const singleFieldUpdatedMetadata =
    await api.functional.communityPlatform.admin.mediaFiles.metadata.update(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: singleFieldUpdate,
      },
    );
  typia.assert(singleFieldUpdatedMetadata);

  // Verify only camera model was updated, other fields remain unchanged
  TestValidator.equals(
    "camera model should be updated",
    singleFieldUpdatedMetadata.camera_model,
    singleFieldUpdate.camera_model,
  );
  TestValidator.equals(
    "width should remain unchanged",
    singleFieldUpdatedMetadata.width,
    updatedMetadata.width,
  );
  TestValidator.equals(
    "height should remain unchanged",
    singleFieldUpdatedMetadata.height,
    updatedMetadata.height,
  );
  TestValidator.equals(
    "GPS latitude should remain unchanged",
    singleFieldUpdatedMetadata.gps_latitude,
    updatedMetadata.gps_latitude,
  );
  TestValidator.equals(
    "GPS longitude should remain unchanged",
    singleFieldUpdatedMetadata.gps_longitude,
    updatedMetadata.gps_longitude,
  );
}
