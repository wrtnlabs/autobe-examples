import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemConfig";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate scope-only and scope+key filtering behavior of system configuration
 * search.
 *
 * Business context: The TodoApp exposes administrative APIs to manage
 * system-wide configuration entries backed by the `todo_app_system_configs`
 * table. Each configuration row is identified by a `scope` and `key` pair (for
 * example, `todo/deletion_model`) and is consumed by various subsystems such as
 * todo lifecycle management and authentication policies.
 *
 * This test ensures that the system configuration search endpoint (PATCH
 * /todoApp/todoAdmin/systemConfigs) correctly honors the `scope` and `key`
 * filters provided through `ITodoAppSystemConfig.IRequest` when invoked by an
 * authenticated todoAdmin.
 *
 * End-to-end workflow:
 *
 * 1. Register a new todoAdmin account using POST /auth/todoAdmin/join to obtain an
 *    authorized admin context and token. The SDK automatically stores the
 *    access token in the connection headers.
 * 2. Insert multiple configuration entries using POST
 *    /todoApp/todoAdmin/systemConfigs, covering at least two scopes:
 *
 *    - Scope: "todo", keys: "deletion_model", "soft_delete_retention_days"
 *    - Scope: "auth", key: "max_login_attempts"
 * 3. Call PATCH /todoApp/todoAdmin/systemConfigs (index) with a request body
 *    where:
 *
 *    - Page = 0
 *    - Limit is large enough to include all inserted rows (for example 10)
 *    - Scope = "todo"
 *    - Key = null (no key filter)
 *    - Is_active, include_deleted, order_by, order_direction = null so that default
 *         behavior applies Then assert that:
 *    - All returned entries have scope === "todo"
 *    - No entry with scope === "auth" is present.
 * 4. Call PATCH /todoApp/todoAdmin/systemConfigs again with the same pagination
 *    but now with:
 *
 *    - Scope = "todo"
 *    - Key = "deletion_model" Then assert that:
 *    - At least one entry is returned
 *    - Every returned entry has scope === "todo" and key === "deletion_model".
 *
 * Type safety and validation rules:
 *
 * - Use ITodoAppTodoAdminJoin.IRequest for the join payload via `satisfies`.
 * - Use ITodoAppSystemConfig.ICreate for create bodies via `satisfies`.
 * - Use ITodoAppSystemConfig.IRequest for search bodies via `satisfies`.
 * - Always call typia.assert on non-void API responses to validate runtime
 *   typing.
 * - Use TestValidator.predicate / equals for business rule assertions, with
 *   descriptive titles.
 * - Never test type errors, HTTP status codes, or deliberately invalid payloads.
 */
export async function test_api_system_configs_search_with_scope_and_key_filters(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin to obtain an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todoapp.example.com/register",
    referrer: "https://admin.todoapp.example.com/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // 2. Create configuration entries in multiple scopes/keys
  const todoDeletionModelCreate = {
    scope: "todo",
    key: "deletion_model",
    value: "soft_delete",
    description: "Deletion model for todos (soft_delete vs hard_delete)",
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  const todoRetentionDaysCreate = {
    scope: "todo",
    key: "soft_delete_retention_days",
    value: "30",
    description: "Number of days to retain soft-deleted todos",
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  const authMaxLoginAttemptsCreate = {
    scope: "auth",
    key: "max_login_attempts",
    value: "5",
    description: "Maximum allowed consecutive failed login attempts",
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  const todoDeletionModel: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: todoDeletionModelCreate,
    });
  typia.assert<ITodoAppSystemConfig>(todoDeletionModel);

  const todoRetentionDays: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: todoRetentionDaysCreate,
    });
  typia.assert<ITodoAppSystemConfig>(todoRetentionDays);

  const authMaxLoginAttempts: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: authMaxLoginAttemptsCreate,
    });
  typia.assert<ITodoAppSystemConfig>(authMaxLoginAttempts);

  // 3. Search by scope only (scope = "todo", key = null)
  const scopeOnlyRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    scope: "todo",
    key: null,
    is_active: null,
    include_deleted: null,
    order_by: null,
    order_direction: null,
  } satisfies ITodoAppSystemConfig.IRequest;

  const scopeOnlyPage: IPageITodoAppSystemConfig.ISummary =
    await api.functional.todoApp.todoAdmin.systemConfigs.index(connection, {
      body: scopeOnlyRequest,
    });
  typia.assert<IPageITodoAppSystemConfig.ISummary>(scopeOnlyPage);

  // Ensure we got at least the two todo configs we just created
  TestValidator.predicate(
    "scope-only search should return at least two todo scoped configs",
    scopeOnlyPage.data.length >= 2,
  );

  // Assert that all configs are in the "todo" scope and no "auth" scope entry exists
  const hasOnlyTodoScope = scopeOnlyPage.data.every(
    (cfg) => cfg.scope === "todo",
  );
  TestValidator.predicate(
    'all configs from scope-only search must have scope "todo"',
    hasOnlyTodoScope,
  );

  const hasAuthScope = scopeOnlyPage.data.some((cfg) => cfg.scope === "auth");
  TestValidator.predicate(
    'scope-only search results must not contain scope "auth"',
    hasAuthScope === false,
  );

  // 4. Search by scope + key (scope = "todo", key = "deletion_model")
  const scopeAndKeyRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    scope: "todo",
    key: "deletion_model",
    is_active: null,
    include_deleted: null,
    order_by: null,
    order_direction: null,
  } satisfies ITodoAppSystemConfig.IRequest;

  const scopeAndKeyPage: IPageITodoAppSystemConfig.ISummary =
    await api.functional.todoApp.todoAdmin.systemConfigs.index(connection, {
      body: scopeAndKeyRequest,
    });
  typia.assert<IPageITodoAppSystemConfig.ISummary>(scopeAndKeyPage);

  TestValidator.predicate(
    "scope+key search for todo/deletion_model should return at least one row",
    scopeAndKeyPage.data.length >= 1,
  );

  const allMatchScopeAndKey = scopeAndKeyPage.data.every(
    (cfg) => cfg.scope === "todo" && cfg.key === "deletion_model",
  );
  TestValidator.predicate(
    'all configs from scope+key search must match scope "todo" and key "deletion_model"',
    allMatchScopeAndKey,
  );

  // Optionally, ensure that the created deletion_model config is among the results
  const containsCreatedDeletionModel = scopeAndKeyPage.data.some(
    (cfg) => cfg.id === todoDeletionModel.id,
  );
  TestValidator.predicate(
    "scope+key search should include the created todo/deletion_model config",
    containsCreatedDeletionModel,
  );
}
