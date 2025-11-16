import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_settings_filter_by_category(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates and obtains authorization token
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
  TestValidator.equals("admin authorized", admin.email, adminEmail);

  // Step 2: Define all valid categories to test
  const categories = [
    "authentication",
    "password_policy",
    "data_management",
    "email_notification",
    "rate_limiting",
    "performance",
  ] as const;

  // Step 3: Test filtering for each category
  for (const category of categories) {
    const response: IPageITodoAppSystemSetting.ISummary =
      await api.functional.todoApp.systemSettings.index(connection, {
        body: {
          setting_category: category,
          page: 1,
          limit: 100,
        } satisfies ITodoAppSystemSetting.IRequest,
      });
    typia.assert(response);

    // Validate pagination structure
    TestValidator.predicate(
      `${category}: pagination object exists`,
      response.pagination !== null && response.pagination !== undefined,
    );
    typia.assert(response.pagination);

    // Validate that all returned settings belong to the requested category
    if (response.data.length > 0) {
      TestValidator.predicate(
        `${category}: all settings match requested category`,
        response.data.every((setting) => setting.setting_category === category),
      );

      // Validate structure of individual settings
      response.data.forEach((setting) => {
        typia.assert(setting);
        TestValidator.predicate(
          `${category}: setting has valid id`,
          setting.id.length > 0,
        );
        TestValidator.predicate(
          `${category}: setting has valid setting_key`,
          setting.setting_key.length > 0,
        );
        TestValidator.predicate(
          `${category}: setting has valid setting_value`,
          setting.setting_value.length > 0,
        );
        TestValidator.predicate(
          `${category}: setting has valid setting_type`,
          ["integer", "string", "boolean", "decimal"].includes(
            setting.setting_type,
          ),
        );
      });
    }

    // Validate pagination values
    TestValidator.predicate(
      `${category}: pagination current >= 0`,
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      `${category}: pagination limit >= 0`,
      response.pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${category}: pagination records >= 0`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `${category}: pagination pages >= 0`,
      response.pagination.pages >= 0,
    );
  }

  // Step 4: Verify filtering works - compare results from different categories
  const authSettings: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        setting_category: "authentication",
        page: 1,
        limit: 100,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(authSettings);

  const passwordSettings: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        setting_category: "password_policy",
        page: 1,
        limit: 100,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(passwordSettings);

  // Verify different categories return different result sets
  if (authSettings.data.length > 0 && passwordSettings.data.length > 0) {
    TestValidator.predicate(
      "different categories return different settings",
      authSettings.data.some(
        (authSetting) =>
          !passwordSettings.data.some(
            (pwSetting) => pwSetting.id === authSetting.id,
          ),
      ),
    );
  }
}
