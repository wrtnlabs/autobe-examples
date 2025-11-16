import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileImageHistory";

/**
 * Validate administrator update of user profile image history audit entry.
 *
 * Test scenario:
 *
 * 1. Register a new administrator account and obtain token credentials.
 * 2. As administrator, create a new profile image history record for a random
 *    user, filling all required fields.
 * 3. Update the profile image history record by changing effective_from,
 *    removed_at, and deleted_at metadata.
 * 4. Verify that the update reflects all changes and that previous values are
 *    properly overwritten, ensuring audit trail and privilege enforcement.
 */
export async function test_api_profile_image_history_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new administrator and obtain credentials.
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_status: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create a profile image history entry for a random user
  const userId = typia.random<string & tags.Format<"uuid">>();
  const originalImageHistoryBody = {
    image_uri: typia.random<string & tags.Format<"uri">>(),
    uploaded_at: new Date().toISOString(),
    effective_from: new Date().toISOString(),
  } satisfies ICommunityPlatformProfileImageHistory.ICreate;
  const original: ICommunityPlatformProfileImageHistory =
    await api.functional.communityPlatform.administrator.users.profileImageHistory.create(
      connection,
      {
        userId,
        body: originalImageHistoryBody,
      },
    );
  typia.assert(original);

  // 3. Update the profile image history entry with new audit timestamps
  const updateBody = {
    effective_from: new Date(Date.now() + 60000).toISOString(), // +1min
    removed_at: new Date(Date.now() + 120000).toISOString(), // +2min
    deleted_at: new Date(Date.now() + 3600000).toISOString(), // +1hr
  } satisfies ICommunityPlatformProfileImageHistory.IUpdate;
  const updated: ICommunityPlatformProfileImageHistory =
    await api.functional.communityPlatform.administrator.users.profileImageHistory.update(
      connection,
      {
        userId,
        profileImageHistoryId: original.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Validate that updated fields reflect changes, and other fields remain unchanged
  TestValidator.equals(
    "image_uri is immutable after update",
    updated.image_uri,
    original.image_uri,
  );
  TestValidator.equals(
    "community_platform_user_id is immutable",
    updated.community_platform_user_id,
    original.community_platform_user_id,
  );
  TestValidator.equals(
    "uploaded_at is immutable",
    updated.uploaded_at,
    original.uploaded_at,
  );
  TestValidator.equals(
    "effective_from reflects updated value",
    updated.effective_from,
    updateBody.effective_from,
  );
  TestValidator.equals(
    "removed_at reflects updated value",
    updated.removed_at,
    updateBody.removed_at,
  );
  TestValidator.equals(
    "deleted_at reflects updated value",
    updated.deleted_at,
    updateBody.deleted_at,
  );
}
