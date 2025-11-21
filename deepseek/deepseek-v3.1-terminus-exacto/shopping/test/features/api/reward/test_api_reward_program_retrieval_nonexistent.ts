import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReward";

/**
 * Test retrieval attempt for non-existent reward program to validate proper
 * error handling.
 *
 * Administrator authenticates and attempts to retrieve a reward program using
 * an invalid UUID that does not correspond to any existing program. Validates
 * that the system returns appropriate error response indicating program not
 * found, ensuring proper validation of reward program existence and UUID format
 * checking. Tests boundary condition for reward program lookup functionality.
 */
export async function test_api_reward_program_retrieval_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator to establish proper authorization context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({ read: true, write: false }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Generate a valid UUID format that doesn't correspond to any existing reward program
  const nonExistentRewardId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve the non-existent reward program and validate error response
  await TestValidator.error(
    "retrieving non-existent reward program should fail",
    async () => {
      await api.functional.shoppingMall.admin.rewards.at(connection, {
        rewardId: nonExistentRewardId,
      });
    },
  );
}
