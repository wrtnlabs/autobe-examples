import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate that an authenticated todoAdmin can create a new system
 * configuration entry.
 *
 * Business context:
 *
 * - System configurations are managed by administrative operators (todoAdmin).
 * - Creation is restricted to authenticated admins; the SDK handles token wiring
 *   when we call the join endpoint on the same connection.
 * - The goal is to verify that the POST /todoApp/todoAdmin/systemConfigs endpoint
 *   accepts a well-formed ITodoAppSystemConfig.ICreate payload and returns a
 *   persisted ITodoAppSystemConfig that reflects our input while populating
 *   server-managed fields.
 *
 * Scenario steps:
 *
 * 1. Register a fresh todoAdmin using /auth/todoAdmin/join with a realistic
 *    ITodoAppTodoAdminJoin.IRequest body.
 *
 *    - Use typia.random to generate a syntactically valid email and URIs.
 *    - Optionally set a displayName; omit ip so the backend can infer it.
 *    - After this call, the SDK sets connection.headers.Authorization for us.
 * 2. Build a concrete ITodoAppSystemConfig.ICreate payload.
 *
 *    - Scope: "todo" (as per examples in the DTO docs)
 *    - Key: "deletion_model"
 *    - Value: "soft_delete"
 *    - Description: human-readable explanation string
 *    - Is_active: true (explicitly, avoiding reliance on defaults)
 * 3. Call api.functional.todoApp.todoAdmin.systemConfigs.create with the
 *    constructed body.
 * 4. Validate the result:
 *
 *    - First, run typia.assert(createdConfig) to ensure the shape is exactly
 *         ITodoAppSystemConfig.
 *    - Then, use TestValidator.equals to assert business expectations:
 *
 *         - CreatedConfig.scope equals the requested scope.
 *         - CreatedConfig.key equals the requested key.
 *         - CreatedConfig.value equals the requested value.
 *         - CreatedConfig.description equals the requested description.
 *         - CreatedConfig.is_active equals true.
 *    - Additionally, confirm server-managed fields behave logically:
 *
 *         - CreatedConfig.id is non-empty (UUID validity is already covered by
 *                   typia.assert, so we do not re-check format).
 *         - CreatedConfig.created_at and createdConfig.updated_at are non-empty strings.
 *         - CreatedConfig.deleted_at is null or undefined (indicating not soft-deleted).
 */
export async function test_api_system_config_creation_by_todoadmin(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin; SDK will wire Authorization on the same connection.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin = await api.functional.auth.todoAdmin.join(connection, {
    body: joinRequest,
  });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // 2. Build the system config creation payload.
  const createConfigBody = {
    scope: "todo",
    key: "deletion_model",
    value: "soft_delete",
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  // 3. Call the systemConfigs.create endpoint as the authenticated admin.
  const createdConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: createConfigBody,
    });
  typia.assert<ITodoAppSystemConfig>(createdConfig);

  // 4. Business-level validations: input vs. output mapping and lifecycle fields.
  TestValidator.equals(
    "system config scope should match input",
    createdConfig.scope,
    createConfigBody.scope,
  );
  TestValidator.equals(
    "system config key should match input",
    createdConfig.key,
    createConfigBody.key,
  );
  TestValidator.equals(
    "system config value should match input",
    createdConfig.value,
    createConfigBody.value,
  );
  TestValidator.equals(
    "system config description should match input",
    createdConfig.description,
    createConfigBody.description,
  );
  TestValidator.equals(
    "system config is_active should match input",
    createdConfig.is_active,
    createConfigBody.is_active,
  );

  // Server-managed fields: basic logical checks without re-validating types/formats.
  TestValidator.predicate(
    "system config id should be a non-empty string",
    createdConfig.id.length > 0,
  );
  TestValidator.predicate(
    "system config created_at should be a non-empty string",
    createdConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "system config updated_at should be a non-empty string",
    createdConfig.updated_at.length > 0,
  );
  TestValidator.predicate(
    "system config deleted_at should be null or undefined on creation",
    createdConfig.deleted_at === null || createdConfig.deleted_at === undefined,
  );
}
