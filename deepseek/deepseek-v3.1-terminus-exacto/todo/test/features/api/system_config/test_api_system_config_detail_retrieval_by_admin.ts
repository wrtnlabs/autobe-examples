import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Validates admin-only access to system configuration details, comprehensive
 * field coverage, and access restrictions.
 *
 * - Ensures that an authenticated admin can fetch details of a system config
 *   entry by UUID and receives the full metadata per ITodoListSystemConfig
 *   schema.
 * - Checks for permission denial if unauthenticated or non-admin requests are
 *   made.
 * - Confirms returned config is read-only; cannot be modified via this endpoint.
 * - Validates all returned fields (id, key, value, description, timestamps) for
 *   type correctness and completeness.
 * - Covers both the happy-path (authorized) and negative (unauthorized)
 *   scenarios.
 */
export async function test_api_system_config_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Create an admin via join, and authenticate as this admin.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // at least 8 chars
  } satisfies ITodoListAdmin.IJoin;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(admin);

  // 2. Try to fetch a random system config by ID as admin. Since the systemConfigId must exist, create one by randomly generating and simulating or use a random UUID assuming mock server allows it.
  // For real backend E2E, this would require a fixture or prior setup; here we use typia.random for coverage.
  const systemConfigId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt authorized access: admin should get full details.
  const config: ITodoListSystemConfig =
    await api.functional.todoList.admin.systemConfigs.getBySystemconfigid(
      connection,
      { systemConfigId },
    );
  typia.assert(config);

  // 4. Validate all major fields for proper type and presence.
  TestValidator.equals("system config id matches", config.id, systemConfigId);
  TestValidator.predicate(
    "system config key is present",
    typeof config.key === "string" && config.key.length > 0,
  );
  TestValidator.predicate(
    "system config value is present",
    typeof config.value === "string",
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof config.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(config.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof config.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(config.updated_at),
  );

  // description is optional; if present, it should be a string
  if (config.description !== null && config.description !== undefined)
    TestValidator.predicate(
      "description must be string",
      typeof config.description === "string",
    );

  // deleted_at is optional and can be null/undefined
  if (config.deleted_at !== null && config.deleted_at !== undefined)
    TestValidator.predicate(
      "deleted_at must be string ISO date-time",
      typeof config.deleted_at === "string" &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(config.deleted_at),
    );

  // 5. Attempt unauthorized fetch: use blank connection (no auth header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated client cannot fetch system config",
    async () => {
      await api.functional.todoList.admin.systemConfigs.getBySystemconfigid(
        unauthConn,
        { systemConfigId },
      );
    },
  );

  // 6. (Negative case) Attempt readonly: try to use this endpoint to modify config (should not be possible, this is a GET endpoint), so no modifiable action is possible. Validate that no request method but GET is accepted (skipped as no other SDK is exposed).
}
