import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEnvironment";

/**
 * Test administrator-driven retirement of a deployment environment.
 *
 * 1. Register a new administrator account, authenticating future privileged
 *    requests.
 * 2. Create a unique deployment environment (ensuring env_key uniqueness on
 *    creation).
 * 3. Soft-delete (retire) the environment by calling the administrative DELETE
 *    endpoint with the env_key.
 * 4. After deletion, validate the environment's response shape:
 *
 *    - Deleted_at field is set (indicating archival/retirement)
 *    - Env_key and id match those used for creation
 * 5. Attempt to soft-delete the same environment again (should be idempotent with
 *    deleted_at already set).
 * 6. Attempt to delete a non-existent environment (should error appropriately).
 */
export async function test_api_environment_deletion_by_administrator(
  connection: api.IConnection,
) {
  // 1. Administrator join and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);
  // 2. Create an environment
  const envKey = RandomGenerator.alphaNumeric(10);
  const envDisplayName = RandomGenerator.name();
  const environment =
    await api.functional.communityPlatform.administrator.environments.create(
      connection,
      {
        body: {
          env_key: envKey,
          display_name: envDisplayName,
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformEnvironment.ICreate,
      },
    );
  typia.assert(environment);
  TestValidator.equals("created env_key matches", environment.env_key, envKey);
  TestValidator.equals(
    "created display_name matches",
    environment.display_name,
    envDisplayName,
  );
  TestValidator.equals("not deleted at creation", environment.deleted_at, null);
  // 3. Delete the environment
  const deletedEnv =
    await api.functional.communityPlatform.administrator.environments.erase(
      connection,
      { envKey },
    );
  typia.assert(deletedEnv);
  TestValidator.equals("deleted id matches", deletedEnv.id, environment.id);
  TestValidator.equals("deleted env_key matches", deletedEnv.env_key, envKey);
  TestValidator.predicate(
    "deleted_at is set after deletion",
    typeof deletedEnv.deleted_at === "string" &&
      deletedEnv.deleted_at.length > 0,
  );
  // 4. Deleting again is idempotent (should remain archived/retired)
  const deletedTwice =
    await api.functional.communityPlatform.administrator.environments.erase(
      connection,
      { envKey },
    );
  typia.assert(deletedTwice);
  TestValidator.equals(
    "deleted_twice id matches",
    deletedTwice.id,
    environment.id,
  );
  TestValidator.equals(
    "deleted_twice env_key matches",
    deletedTwice.env_key,
    envKey,
  );
  TestValidator.equals(
    "deleted_twice already has deleted_at set",
    deletedTwice.deleted_at,
    deletedEnv.deleted_at,
  );
  // 5. Attempt to delete a non-existent environment (should error)
  await TestValidator.error(
    "deleting non-existent envKey returns error",
    async () => {
      await api.functional.communityPlatform.administrator.environments.erase(
        connection,
        { envKey: RandomGenerator.alphaNumeric(16) },
      );
    },
  );
}
