import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate creation of system configurations with and without optional fields.
 *
 * Business goal: Ensure that the TodoApp system configuration creation endpoint
 * correctly applies defaults for optional fields when omitted, and faithfully
 * persists explicit values when they are provided. This protects configuration
 * behavior such as feature flags and global settings where omission of an
 * option should not unintentionally disable or enable features.
 *
 * End-to-end flow:
 *
 * 1. Register a new todoAdmin via /auth/todoAdmin/join to obtain an authenticated
 *    administrative context. The SDK will automatically attach the access token
 *    to the shared connection.
 * 2. Using that authenticated connection, call
 *    api.functional.todoApp.todoAdmin.systemConfigs.create with a minimal
 *    ITodoAppSystemConfig.ICreate payload containing only the required fields:
 *
 *    - Scope
 *    - Key
 *    - Value and omit the optional fields `description` and `is_active`.
 * 3. Assert the response type using typia.assert, then verify that:
 *
 *    - `scope`, `key`, and `value` match the request payload.
 *    - `description` is left as undefined (because the DTO models description as an
 *         optional string without null), meaning the backend did not inject any
 *         unexpected description.
 *    - `is_active` is true, reflecting the documented default behavior when not
 *         explicitly provided in the create DTO.
 * 4. Next, call the same create endpoint again with a fully populated
 *    ITodoAppSystemConfig.ICreate payload that explicitly sets:
 *
 *    - `description` to a non-empty string such as "Beta UI exposure flag".
 *    - `is_active` to false so that the configuration is created in an inactive
 *         state from the outset.
 * 5. Assert the second response via typia.assert and verify that:
 *
 *    - `scope`, `key`, and `value` round-trip exactly as requested.
 *    - `description` is exactly the string sent in the request.
 *    - `is_active` is false, confirming that explicit values override any default
 *         behavior.
 * 6. Use TestValidator.equals and TestValidator.predicate with descriptive titles
 *    for all business rule assertions, and avoid any tests based on HTTP status
 *    codes or type error scenarios.
 *
 * Edge considerations and constraints:
 *
 * - Scope and key pairs must be unique; therefore, use randomized or highly
 *   specific `key` values for each configuration to avoid conflicts with other
 *   tests or previously created rows.
 * - Description is modeled as an optional string (no null/undefined union on the
 *   concrete ITodoAppSystemConfig type), so for the first creation we only
 *   assert that it remains undefined rather than attempting to compare to
 *   null.
 * - For the first creation, we do not send `is_active` in the request but expect
 *   the backend to default `is_active` to true.
 */
export async function test_api_system_config_creation_with_optional_fields_and_defaults(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin to obtain authorized context.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todoapp.example.com/settings/system-configs",
    referrer: "https://admin.todoapp.example.com/login",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create a minimal configuration omitting optional fields.
  const minimalConfigRequest = {
    scope: "system",
    key: `feature_flag_beta_ui_${RandomGenerator.alphaNumeric(8)}`,
    value: "true",
  } satisfies ITodoAppSystemConfig.ICreate;

  const minimalConfig: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: minimalConfigRequest,
    });
  typia.assert(minimalConfig);

  // 3. Validate minimal configuration behavior.
  TestValidator.equals(
    "minimal config: scope should match request",
    minimalConfig.scope,
    minimalConfigRequest.scope,
  );
  TestValidator.equals(
    "minimal config: key should match request",
    minimalConfig.key,
    minimalConfigRequest.key,
  );
  TestValidator.equals(
    "minimal config: value should match request",
    minimalConfig.value,
    minimalConfigRequest.value,
  );
  TestValidator.predicate(
    "minimal config: description should be undefined when omitted",
    minimalConfig.description === undefined,
  );
  TestValidator.equals(
    "minimal config: is_active should default to true when omitted",
    minimalConfig.is_active,
    true,
  );

  // 4. Create a configuration with explicit optional fields.
  const explicitDescription = "Beta UI exposure flag";
  const explicitConfigRequest = {
    scope: "system",
    key: `feature_flag_beta_ui_explicit_${RandomGenerator.alphaNumeric(8)}`,
    value: "false",
    description: explicitDescription,
    is_active: false,
  } satisfies ITodoAppSystemConfig.ICreate;

  const explicitConfig: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: explicitConfigRequest,
    });
  typia.assert(explicitConfig);

  // 5. Validate explicit configuration behavior.
  TestValidator.equals(
    "explicit config: scope should match request",
    explicitConfig.scope,
    explicitConfigRequest.scope,
  );
  TestValidator.equals(
    "explicit config: key should match request",
    explicitConfig.key,
    explicitConfigRequest.key,
  );
  TestValidator.equals(
    "explicit config: value should match request",
    explicitConfig.value,
    explicitConfigRequest.value,
  );
  TestValidator.equals(
    "explicit config: description should match request",
    explicitConfig.description,
    explicitConfigRequest.description,
  );
  TestValidator.equals(
    "explicit config: is_active should match explicit false",
    explicitConfig.is_active,
    explicitConfigRequest.is_active,
  );
}
