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
 * Validate deletion behavior for non-existent and already-deleted system
 * settings.
 *
 * Business objectives:
 *
 * - Deleting a system setting by a key that has no active (non-deleted) record
 *   must behave as a not-found style error.
 * - Deleting an existing system setting succeeds once; a second delete on the
 *   same key must behave as not-found and must not resurrect or corrupt data.
 * - Other unrelated settings must remain intact after deletion attempts.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate an admin user via POST /auth/adminUser/join.
 * 2. Create two baseline system settings via POST
 *    /todoApp/adminUser/systemSettings:
 *
 *    - One that will be deleted ("existing_setting").
 *    - One that must remain intact ("other_setting").
 * 3. Optionally list settings via PATCH /todoApp/adminUser/systemSettings to
 *    confirm both keys exist and are enabled.
 * 4. Attempt to DELETE a clearly non-existent key and assert not-found behavior.
 * 5. DELETE the existing_setting key once and expect success.
 * 6. DELETE the same existing_setting key again and assert not-found behavior.
 * 7. Use GET /todoApp/adminUser/systemSettings/{settingKey} to verify that
 *    non-existent and deleted keys behave as not-found, while other_setting is
 *    still retrievable and intact.
 */
export async function test_api_system_setting_delete_nonexistent_key(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user (join only).
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.todo-app.test/landing" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create baseline system settings: one to delete, one to remain.
  const existingKey = `existing_setting_${RandomGenerator.alphaNumeric(8)}`;
  const otherKey = `other_setting_${RandomGenerator.alphaNumeric(8)}`;

  const existingCreateBody = {
    key: existingKey,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const otherCreateBody = {
    key: otherKey,
    value: "true",
    type: "boolean",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "features",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const existingSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: existingCreateBody,
    });
  typia.assert(existingSetting);

  const otherSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: otherCreateBody,
    });
  typia.assert(otherSetting);

  TestValidator.equals(
    "created existing setting key matches",
    existingSetting.key,
    existingKey,
  );
  TestValidator.equals(
    "created other setting key matches",
    otherSetting.key,
    otherKey,
  );

  // 3. Confirm baseline via listing.
  const listRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    key: undefined,
    group: undefined,
    enabled: null,
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ITodoAppSystemSetting.IRequest;

  const pageResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: listRequestBody,
    });
  typia.assert(pageResult);

  const existingSummary = pageResult.data.find(
    (row) => row.key === existingKey,
  );
  const otherSummary = pageResult.data.find((row) => row.key === otherKey);

  TestValidator.predicate(
    "existing setting should appear in listing",
    existingSummary !== undefined,
  );
  TestValidator.predicate(
    "other setting should appear in listing",
    otherSummary !== undefined,
  );

  if (existingSummary !== undefined) {
    TestValidator.equals(
      "existing setting summary enabled",
      existingSummary.enabled,
      true,
    );
  }
  if (otherSummary !== undefined) {
    TestValidator.equals(
      "other setting summary enabled",
      otherSummary.enabled,
      true,
    );
  }

  // 4. Delete a clearly non-existent key and expect not-found behavior.
  const nonexistentKey = `nonexistent_setting_${RandomGenerator.alphaNumeric(8)}`;

  TestValidator.predicate(
    "nonexistent key must differ from existing and other keys",
    nonexistentKey !== existingKey && nonexistentKey !== otherKey,
  );

  await TestValidator.error(
    "erase should fail for non-existent key",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.erase(connection, {
        settingKey: nonexistentKey,
      });
    },
  );

  // 5. Delete existing setting once and expect success.
  await api.functional.todoApp.adminUser.systemSettings.erase(connection, {
    settingKey: existingKey,
  });

  // 6. Delete the same setting again and expect not-found behavior.
  await TestValidator.error(
    "second erase of same key should behave as not-found",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.erase(connection, {
        settingKey: existingKey,
      });
    },
  );

  // 7. Validate detail retrieval behavior for non-existent and deleted keys.
  await TestValidator.error(
    "GET on never-existing key should be not-found",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.at(connection, {
        settingKey: nonexistentKey,
      });
    },
  );

  await TestValidator.error(
    "GET on deleted existing key should be not-found",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.at(connection, {
        settingKey: existingKey,
      });
    },
  );

  // 8. Validate that unrelated setting remains intact.
  const otherDetail: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.at(connection, {
      settingKey: otherKey,
    });
  typia.assert(otherDetail);

  TestValidator.equals(
    "other setting detail key should match",
    otherDetail.key,
    otherKey,
  );
  TestValidator.equals(
    "other setting detail value should match",
    otherDetail.value,
    otherCreateBody.value,
  );
  TestValidator.equals(
    "other setting detail type should match",
    otherDetail.type,
    otherCreateBody.type,
  );
  TestValidator.equals(
    "other setting detail enabled should remain true",
    otherDetail.enabled,
    true,
  );
}
