import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate that an adminUser can delete a guest user and that the record
 * becomes inaccessible.
 *
 * Business workflow covered:
 *
 * 1. Register a fresh adminUser account to obtain an authenticated admin context.
 * 2. As that adminUser, create a system configuration row to satisfy admin-only
 *    dependencies.
 * 3. Retrieve a guest user record that will serve as the deletion target.
 * 4. Delete the guest user via the admin-only DELETE endpoint.
 * 5. Verify that subsequent retrieval attempts for the same guest user id fail.
 */
export async function test_api_admin_guest_user_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser and establish authenticated admin context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a system configuration as this adminUser
  const systemConfigBody = {
    category: "guest_retention",
    config_key: "guest_user_deletion_policy",
    value: "immediate_delete",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const createdConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: systemConfigBody },
    );
  typia.assert(createdConfig);

  // 3. Retrieve a guest user that will be the target of deletion
  // In real E2E, this would point to an existing guest record. For this test,
  // we assume simulation or pre-populated data and focus on delete+re-read.
  const targetGuest: ICommunityPlatformGuestuser =
    await api.functional.communityPlatform.adminUser.guestUsers.at(connection, {
      guestUserId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(targetGuest);

  // 4. Delete the guest user via admin-only DELETE endpoint
  await api.functional.communityPlatform.adminUser.guestUsers.erase(
    connection,
    {
      guestUserId: targetGuest.id,
    },
  );

  // 5. Verify that subsequent retrieval of the same guest user id fails
  await TestValidator.error(
    "guest user should not be retrievable after deletion",
    async () => {
      await api.functional.communityPlatform.adminUser.guestUsers.at(
        connection,
        { guestUserId: targetGuest.id },
      );
    },
  );
}
