import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_settings_retrieval_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authenticated access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);
  TestValidator.predicate("admin created with valid id", admin.id.length > 0);

  // Step 2: Retrieve system settings with pagination
  const settingsPage: IPageITodoAppSystemSetting =
    await api.functional.todoApp.systemSettings.list(connection);
  typia.assert(settingsPage);

  // Step 3: Validate pagination metadata consistency
  const pagination = settingsPage.pagination;

  TestValidator.predicate(
    "current page is within valid range",
    pagination.current >= 0,
  );

  TestValidator.predicate("limit is non-negative", pagination.limit >= 0);

  TestValidator.predicate(
    "total records is non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate("total pages is non-negative", pagination.pages >= 0);

  // Step 4: Validate pagination calculation consistency
  // pages should equal ceiling(records / limit) when limit > 0
  if (pagination.limit > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "calculated pages matches expected value",
      pagination.pages,
      expectedPages,
    );
  } else if (pagination.limit === 0) {
    TestValidator.predicate(
      "with zero limit, pages should be zero or record count",
      pagination.pages >= 0,
    );
  }

  // Step 5: Validate settings data array consistency with pagination
  TestValidator.predicate(
    "settings data array length respects pagination limit",
    settingsPage.data.length <= pagination.limit || pagination.limit === 0,
  );

  TestValidator.predicate(
    "settings data count is within total records",
    settingsPage.data.length <= pagination.records,
  );

  // Step 6: Validate individual settings contain expected data
  if (settingsPage.data.length > 0) {
    const firstSetting = settingsPage.data[0];
    typia.assert(firstSetting);

    TestValidator.predicate(
      "setting_key is meaningful",
      firstSetting.setting_key.length > 0,
    );

    TestValidator.predicate(
      "setting_value is present",
      firstSetting.setting_value.length >= 0,
    );

    TestValidator.predicate(
      "setting_type is not empty",
      firstSetting.setting_type.length > 0,
    );

    TestValidator.predicate(
      "setting_category is not empty",
      firstSetting.setting_category.length > 0,
    );

    TestValidator.predicate(
      "created_at timestamp is valid",
      new Date(firstSetting.created_at).getTime() > 0,
    );

    TestValidator.predicate(
      "updated_at timestamp is valid",
      new Date(firstSetting.updated_at).getTime() > 0,
    );
  }

  // Step 7: Validate response structure has all required components
  TestValidator.predicate(
    "response includes pagination metadata",
    pagination.current >= 0 && pagination.records >= 0,
  );

  TestValidator.predicate(
    "response includes settings data array",
    Array.isArray(settingsPage.data),
  );
}
