import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEnvironment";

/**
 * Validate that an administrator can create a new environment entry.
 *
 * This test ensures that:
 *
 * 1. An administrator can successfully register (join).
 * 2. When authenticated as an administrator, a valid environment creation payload
 *    can be submitted (env_key, display_name, optional description).
 * 3. The response includes the newly created environment with all provided and
 *    system-managed fields populated (id, env_key, display_name, description,
 *    created_at, updated_at, deleted_at).
 * 4. Uniqueness of env_key is enforced.
 * 5. System-managed timestamps (created_at, updated_at) are correctly set.
 *
 * Step-by-step process:
 *
 * - Register a new administrator.
 * - Authenticate as admin (implicit via join).
 * - Compose a unique environment creation payload.
 * - Submit creation and assert correct output.
 * - Attempt to create an environment with duplicate env_key (should fail).
 */
export async function test_api_environment_creation_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Register a new administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);
  // Step 2: Create a unique environment as admin
  const payload = {
    env_key: RandomGenerator.alphabets(10),
    display_name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformEnvironment.ICreate;
  const created =
    await api.functional.communityPlatform.administrator.environments.create(
      connection,
      { body: payload },
    );
  typia.assert(created);
  // Step 3: Validate that all fields are present and correct
  TestValidator.equals(
    "env_key matches the request",
    created.env_key,
    payload.env_key,
  );
  TestValidator.equals(
    "display_name matches the request",
    created.display_name,
    payload.display_name,
  );
  TestValidator.equals(
    "description matches the request",
    created.description,
    payload.description,
  );
  TestValidator.predicate(
    "id is a valid UUID",
    typeof created.id === "string" && created.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO datetime",
    typeof created.created_at === "string" && created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO datetime",
    typeof created.updated_at === "string" && created.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null on creation",
    created.deleted_at,
    null,
  );
  // Step 4: Attempt to create another environment with the same env_key
  await TestValidator.error("duplicate env_key should fail", async () => {
    await api.functional.communityPlatform.administrator.environments.create(
      connection,
      { body: { ...payload, display_name: RandomGenerator.name(2) } },
    );
  });
}
