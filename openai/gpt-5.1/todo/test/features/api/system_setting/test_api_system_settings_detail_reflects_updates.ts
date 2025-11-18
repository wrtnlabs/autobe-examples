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
 * Verify that the system setting detail endpoint reflects updates performed by
 * the update endpoint for an authenticated admin user.
 *
 * Business context:
 *
 * - System settings in todoApp are global configuration entries stored in
 *   `todo_app_system_settings`, with a stable identity (id, key, created_at)
 *   and mutable configuration fields (value, type, description, group, enabled,
 *   updated_at, deleted_at).
 * - Admin users manage these settings via the adminUser actor APIs. Joining as an
 *   admin issues JWT tokens that the SDK automatically wires into
 *   `connection.headers.Authorization`, so subsequent calls on the same
 *   connection are authenticated.
 * - The detail endpoint `GET /todoApp/adminUser/systemSettings/{settingKey}`
 *   returns the full `ITodoAppSystemSetting` for a given business key, while
 *   the update endpoint `PUT /todoApp/adminUser/systemSettings/{settingKey}`
 *   applies partial updates using `ITodoAppSystemSetting.IUpdate` and returns
 *   the updated entity. The index endpoint `PATCH
 *   /todoApp/adminUser/systemSettings` returns `ISummary` projections for
 *   listing.
 *
 * Test flow:
 *
 * 1. Join an admin via `POST /auth/adminUser/join` to establish an authenticated
 *    admin session. The returned token is wired into `connection` by the SDK.
 * 2. Create a new system setting via `POST /todoApp/adminUser/systemSettings` with
 *    a unique key and initial values for `value`, `type`, `description`,
 *    `group`, and `enabled`.
 * 3. Immediately fetch the created setting via `GET
 *    /todoApp/adminUser/systemSettings/{settingKey}` and record its `id`,
 *    `key`, `created_at`, `updated_at`, and mutable fields.
 * 4. Build an `ITodoAppSystemSetting.IUpdate` payload that changes `value`,
 *    `description`, `group`, `enabled`, and optionally `type`, and send it via
 *    `PUT /todoApp/adminUser/systemSettings/{settingKey}`.
 * 5. Fetch the setting again via the detail GET and verify that:
 *
 *    - `id` and `key` are unchanged.
 *    - `created_at` is unchanged.
 *    - `updated_at` has increased compared to the previous value.
 *    - The mutable fields (`value`, `type`, `description`, `group`, `enabled`) match
 *         the update payload.
 * 6. Optionally call `PATCH /todoApp/adminUser/systemSettings` with a filter on
 *    `key` to retrieve a paginated summary list, locate the summary entry for
 *    this key, and assert that its `value`, `type`, `description`, `group`, and
 *    `enabled` fields match the updated entity.
 */
export async function test_api_system_settings_detail_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Join an admin user to obtain an authorized connection
  const adminJoinBody = typia.random<ITodoAppAdminUser.IJoin>();
  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a new system setting with a unique key and initial values
  const settingKey = `e2e_test_setting_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    key: settingKey,
    value: "10",
    type: "int",
    description: "Initial description for E2E test setting",
    group: "e2e-tests",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const created: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  TestValidator.equals(
    "created setting key should match requested key",
    created.key,
    settingKey,
  );

  // 3. Fetch the created setting via detail GET to get baseline timestamps
  const initialDetail: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.at(connection, {
      settingKey,
    });
  typia.assert(initialDetail);

  TestValidator.equals(
    "detail id matches created id",
    initialDetail.id,
    created.id,
  );
  TestValidator.equals(
    "detail key matches created key",
    initialDetail.key,
    created.key,
  );
  TestValidator.equals(
    "detail created_at matches created created_at",
    initialDetail.created_at,
    created.created_at,
  );

  const previousUpdatedAt = initialDetail.updated_at;

  // 4. Update the setting with changed value/description/group/enabled/type
  const updateBody = {
    value: "20",
    type: "string",
    description: "Updated description for E2E test setting",
    group: "e2e-tests-updated",
    enabled: false,
  } satisfies ITodoAppSystemSetting.IUpdate;

  const updated: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.update(connection, {
      settingKey,
      body: updateBody,
    });
  typia.assert(updated);

  // Identity invariants
  TestValidator.equals(
    "updated id remains same as created",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "updated key remains same as path settingKey",
    updated.key,
    settingKey,
  );
  TestValidator.equals(
    "updated created_at remains unchanged",
    updated.created_at,
    created.created_at,
  );

  // Mutable fields should reflect update payload
  TestValidator.equals(
    "updated value matches update payload",
    updated.value,
    updateBody.value,
  );
  TestValidator.equals(
    "updated type matches update payload",
    updated.type,
    updateBody.type,
  );
  TestValidator.equals(
    "updated description matches update payload",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated group matches update payload",
    updated.group,
    updateBody.group,
  );
  TestValidator.equals(
    "updated enabled matches update payload",
    updated.enabled,
    updateBody.enabled,
  );

  await TestValidator.predicate(
    "updated_at should increase after update",
    () => {
      const before = new Date(previousUpdatedAt).getTime();
      const after = new Date(updated.updated_at).getTime();
      return after > before;
    },
  );

  // 5. Fetch detail again and validate it matches the updated entity
  const detailAfterUpdate: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.at(connection, {
      settingKey,
    });
  typia.assert(detailAfterUpdate);

  TestValidator.equals(
    "detail-after-update id matches updated id",
    detailAfterUpdate.id,
    updated.id,
  );
  TestValidator.equals(
    "detail-after-update key matches settingKey",
    detailAfterUpdate.key,
    settingKey,
  );
  TestValidator.equals(
    "detail-after-update created_at matches updated created_at",
    detailAfterUpdate.created_at,
    updated.created_at,
  );
  TestValidator.equals(
    "detail-after-update value matches updated value",
    detailAfterUpdate.value,
    updated.value,
  );
  TestValidator.equals(
    "detail-after-update type matches updated type",
    detailAfterUpdate.type,
    updated.type,
  );
  TestValidator.equals(
    "detail-after-update description matches updated description",
    detailAfterUpdate.description,
    updated.description,
  );
  TestValidator.equals(
    "detail-after-update group matches updated group",
    detailAfterUpdate.group,
    updated.group,
  );
  TestValidator.equals(
    "detail-after-update enabled matches updated enabled",
    detailAfterUpdate.enabled,
    updated.enabled,
  );

  await TestValidator.predicate(
    "detail-after-update updated_at matches update response updated_at",
    detailAfterUpdate.updated_at === updated.updated_at,
  );

  // 6. Optionally verify summary view via index with key filter
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

  const summaries = page.data;
  await TestValidator.predicate(
    "index result should contain at least one summary for the setting key",
    summaries.some((s) => s.key === settingKey),
  );

  const summary = summaries.find((s) => s.key === settingKey);
  if (summary !== undefined) {
    typia.assert(summary);

    TestValidator.equals(
      "summary value matches updated value",
      summary.value,
      updated.value,
    );
    TestValidator.equals(
      "summary type matches updated type",
      summary.type,
      updated.type,
    );
    TestValidator.equals(
      "summary description matches updated description",
      summary.description,
      updated.description,
    );
    TestValidator.equals(
      "summary group matches updated group",
      summary.group,
      updated.group,
    );
    TestValidator.equals(
      "summary enabled matches updated enabled",
      summary.enabled,
      updated.enabled,
    );
  }
}
