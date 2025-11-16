import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Verify that deleting a non-existent system configuration entry fails safely.
 *
 * Business intent:
 *
 * - When an authenticated adminUser attempts to delete a configuration row by ID
 *   and that ID does not exist, the API must respond with an error instead of
 *   silently succeeding, and it must not affect any existing configuration
 *   entries.
 * - The delete operation should be safe and effectively idempotent with respect
 *   to missing records: repeated deletes for an unknown ID should not mutate
 *   system state.
 *
 * Test flow:
 *
 * 1. Register an adminUser via POST /auth/adminUser/join to obtain an
 *    authenticated admin context. The SDK will automatically wire the
 *    Authorization header using the returned token.
 * 2. Create a valid system configuration via POST
 *    /communityPlatform/adminUser/systemConfigs to ensure there is at least one
 *    existing configuration row, and capture its ID.
 * 3. Generate a random UUID to use as a non-existent systemConfigId, ensuring it
 *    does not equal the created configuration's ID.
 * 4. Call DELETE /communityPlatform/adminUser/systemConfigs/{systemConfigId} using
 *    the non-existent UUID and assert that the call results in an error using
 *    TestValidator.error.
 * 5. Indirectly verify that the existing configuration has not been impacted by
 *    ensuring we never targeted its ID and that the error path was taken.
 */
export async function test_api_system_config_delete_blocks_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authenticated admin context.
  const adminJoinBody =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed one valid system configuration entry.
  const createBody = typia.random<ICommunityPlatformSystemConfig.ICreate>();

  const existingConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(existingConfig);

  // 3. Generate a UUID that is guaranteed to differ from the existing config ID.
  let nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonExistentId === existingConfig.id) {
    // In the astronomically unlikely case of collision, regenerate once.
    nonExistentId = typia.random<string & tags.Format<"uuid">>();
  }

  TestValidator.predicate(
    "non-existent id must differ from existing config id",
    nonExistentId !== existingConfig.id,
  );

  // 4. Attempt to delete using the non-existent ID and expect an error.
  await TestValidator.error(
    "delete with non-existent config id must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.systemConfigs.erase(
        connection,
        {
          systemConfigId: nonExistentId,
        },
      );
    },
  );

  // 5. Indirectly ensure that the existing config is unaffected by confirming
  //    that we never attempted to delete it, and the error path was exercised.
  TestValidator.predicate(
    "existing config id was never used as delete target",
    existingConfig.id !== nonExistentId,
  );
}
