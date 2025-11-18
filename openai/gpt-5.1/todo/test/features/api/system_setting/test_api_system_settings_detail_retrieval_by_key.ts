import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate detailed retrieval of a system setting by its unique business key.
 *
 * ## Business context
 *
 * System settings in the todoApp backend represent cross-cutting configuration
 * entries (limits, feature flags, etc.) stored in `todo_app_system_settings`.
 * Administrative APIs allow an `adminUser` actor to create and inspect these
 * settings. The detail endpoint `GET
 * /todoApp/adminUser/systemSettings/{settingKey}` must reliably return the full
 * ITodoAppSystemSetting record for a given business key, including metadata
 * fields (id, created_at, updated_at, deleted_at) and core business fields
 * (key, value, type, description, group, enabled).
 *
 * ## Test purpose
 *
 * This test ensures that:
 *
 * - After an admin joins and creates a new system setting with a known key, the
 *   detail endpoint can load that exact setting by its key.
 * - The returned ITodoAppSystemSetting matches the creation payload for all
 *   overlapping fields.
 * - Server-managed metadata fields are present and have the expected semantics
 *   for a freshly created, non-deleted record.
 * - The listing endpoint (PATCH /todoApp/adminUser/systemSettings) returns a
 *   summary that is consistent with the detail view for the same key.
 *
 * ## Scenario steps
 *
 * 1. Register an admin user through `api.functional.auth.adminUser.join` using a
 *    random-but-valid payload for ITodoAppAdminUser.IJoin.
 *
 *    - The join call will also set the Authorization header on the connection for
 *         subsequent admin-only operations.
 * 2. Create a new system setting via
 *    `api.functional.todoApp.adminUser.systemSettings.create`.
 *
 *    - Construct a unique key such as "test.setting.detail." plus a random suffix to
 *         avoid collisions.
 *    - Provide explicit values for value, type, description, group, and enabled.
 *    - Use `satisfies ITodoAppSystemSetting.ICreate` when constructing the request
 *         body.
 *    - Assert the response with `typia.assert`.
 * 3. Retrieve the setting detail by key via
 *    `api.functional.todoApp.adminUser.systemSettings.at`.
 *
 *    - Pass the same key used at creation as `settingKey`.
 *    - Assert the response type using `typia.assert<ITodoAppSystemSetting>`.
 * 4. Validate business expectations:
 *
 *    - Using `TestValidator.equals` (with descriptive titles), verify that the
 *         detail response has:
 *
 *         - Key equal to the original key
 *         - Value, type, description, group, and enabled equal to the creation payload
 *    - Use `TestValidator.predicate` to assert that:
 *
 *         - Id is a non-empty string (typia.assert already checks uuid, so we only need
 *                   to assert business logic such as non-emptiness if desired)
 *         - Created_at and updated_at are non-empty strings (typia.assert ensures
 *                   date-time format)
 *         - Deleted_at is null or undefined for a freshly created setting.
 * 5. Optionally cross-check with the index endpoint:
 *
 *    - Call `api.functional.todoApp.adminUser.systemSettings.index` with a body that
 *         filters by the same key, and reasonable pagination (e.g. page=1,
 *         pageSize=10).
 *    - Assert the response type as `IPageITodoAppSystemSetting.ISummary`.
 *    - Ensure at least one record is returned whose key matches the test key.
 *    - Find that summary record and verify via `TestValidator.equals` that
 *         summary.key, summary.value, summary.type, summary.description,
 *         summary.group, and summary.enabled match the detail object.
 *
 * ## Error conditions and edge cases
 *
 * - This test does not attempt to validate 404 behavior or missing keys; it
 *   focuses on the happy path where the setting exists.
 * - It also does not attempt to test type-level or schema-level validation
 *   errors; those are covered elsewhere. All request bodies must respect their
 *   DTO types.
 *
 * ## Implementation notes
 *
 * - Use only the imports available in the test template: api, typia, tags,
 *   RandomGenerator, TestValidator, ArrayUtil, and the DTO types.
 * - Avoid manipulating `connection.headers` directly; rely on the join endpoint
 *   to manage Authorization.
 * - Use explicit `await` for all API calls.
 * - Use `satisfies` when building request bodies for IJoin, ICreate, and IRequest
 *   DTOs.
 */
export async function test_api_system_settings_detail_retrieval_by_key(
  connection: api.IConnection,
) {
  // 1. Register an admin user so that subsequent systemSettings calls
  //    are authenticated as adminUser.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.local/join",
    referrer: "https://admin.todo-app.local/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new system setting with a unique key and known payload.
  const uniqueSuffix: string = RandomGenerator.alphaNumeric(12);
  const settingKey: string = `test.setting.detail.${uniqueSuffix}`;

  const createBody = {
    key: settingKey,
    value: "42",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "e2e-detail-test",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const created: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Basic equality checks between creation payload and created record.
  TestValidator.equals(
    "detail create: key should match input key",
    created.key,
    createBody.key,
  );
  TestValidator.equals(
    "detail create: value should match input value",
    created.value,
    createBody.value,
  );
  TestValidator.equals(
    "detail create: type should match input type",
    created.type,
    createBody.type,
  );
  TestValidator.equals(
    "detail create: description should match input description",
    created.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "detail create: group should match input group",
    created.group ?? null,
    createBody.group ?? null,
  );
  TestValidator.equals(
    "detail create: enabled should match input enabled",
    created.enabled,
    createBody.enabled,
  );

  // 3. Retrieve the system setting by its key using the detail endpoint.
  const detailed: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.at(connection, {
      settingKey,
    });
  typia.assert(detailed);

  // 4. Validate that the detailed record matches creation payload and
  //    basic metadata expectations.
  TestValidator.equals(
    "detail at: key should equal path key",
    detailed.key,
    settingKey,
  );
  TestValidator.equals(
    "detail at: value should equal created value",
    detailed.value,
    createBody.value,
  );
  TestValidator.equals(
    "detail at: type should equal created type",
    detailed.type,
    createBody.type,
  );
  TestValidator.equals(
    "detail at: description should equal created description",
    detailed.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "detail at: group should equal created group",
    detailed.group ?? null,
    createBody.group ?? null,
  );
  TestValidator.equals(
    "detail at: enabled should equal created enabled",
    detailed.enabled,
    createBody.enabled,
  );

  TestValidator.predicate(
    "detail at: id must be non-empty string",
    typeof detailed.id === "string" && detailed.id.length > 0,
  );
  TestValidator.predicate(
    "detail at: created_at must be non-empty string",
    typeof detailed.created_at === "string" && detailed.created_at.length > 0,
  );
  TestValidator.predicate(
    "detail at: updated_at must be non-empty string",
    typeof detailed.updated_at === "string" && detailed.updated_at.length > 0,
  );
  TestValidator.predicate(
    "detail at: deleted_at must be null or undefined for new setting",
    detailed.deleted_at === null || detailed.deleted_at === undefined,
  );

  // 5. Cross-check with index listing filtered by key to ensure that the
  //    summary view is consistent with the detail view.
  const indexBody = {
    page: 1,
    pageSize: 10,
    key: settingKey,
  } satisfies ITodoAppSystemSetting.IRequest;

  const page: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: indexBody,
    });
  typia.assert(page);

  TestValidator.predicate(
    "index: at least one summary should be returned for the created key",
    page.pagination.records >= 1 && page.data.length >= 1,
  );

  const summary = page.data.find((row) => row.key === settingKey);
  TestValidator.predicate(
    "index: summary entry for created key must exist",
    summary !== undefined,
  );

  if (summary !== undefined) {
    TestValidator.equals(
      "index vs detail: key should match",
      summary.key,
      detailed.key,
    );
    TestValidator.equals(
      "index vs detail: value should match",
      summary.value,
      detailed.value,
    );
    TestValidator.equals(
      "index vs detail: type should match",
      summary.type,
      detailed.type,
    );
    TestValidator.equals(
      "index vs detail: description should match",
      summary.description ?? null,
      detailed.description ?? null,
    );
    TestValidator.equals(
      "index vs detail: group should match",
      summary.group ?? null,
      detailed.group ?? null,
    );
    TestValidator.equals(
      "index vs detail: enabled should match",
      summary.enabled,
      detailed.enabled,
    );
  }
}
