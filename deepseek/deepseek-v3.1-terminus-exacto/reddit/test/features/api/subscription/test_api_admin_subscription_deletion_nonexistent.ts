import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test administrator attempt to delete a non-existent subscription. This
 * validates error handling and proper response when administrators attempt to
 * delete subscription records that do not exist in the system. The scenario
 * tests the system's resilience against invalid deletion requests.
 */
export async function test_api_admin_subscription_deletion_nonexistent(
  connection: api.IConnection,
) {
  // Create administrator account for authentication context
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Attempt to delete a non-existent subscription using a random UUID
  const nonExistentSubscriptionId = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "deleting non-existent subscription should fail",
    async () => {
      await api.functional.communityPlatform.admin.subscriptions.erase(
        connection,
        {
          subscriptionId: nonExistentSubscriptionId,
        },
      );
    },
  );
}
