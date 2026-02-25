import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Validate that administrators can retrieve all active system settings without filtering.
 * This represents the primary administrative use case where administrators need to view
 * the complete configuration dashboard. Test loading default settings sorted alphabetically,
 * verify pagination metadata accuracy, and ensure only active settings are displayed by default.
 */
export async function test_api_system_settings_search_all_active(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password:
        typia.random<string & tags.Format<"password">>() || "AdminPassword123!",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Search for all active system settings with default parameters
  const settingsPage =
    await api.functional.ecommerce.administrator.system_settings.index(
      adminConnection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 50,
        } satisfies IEcommerceSystemSetting.IRequest,
      },
    );
  typia.assert(settingsPage);
  // Validate pagination metadata
  TestValidator.equals("page number", settingsPage.pagination.current, 1);
  TestValidator.predicate("positive limit", settingsPage.pagination.limit > 0);
  TestValidator.predicate(
    "reasonable limit",
    settingsPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "non-negative records",
    settingsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "non-negative pages",
    settingsPage.pagination.pages >= 0,
  );
  // Validate that all returned settings are active
  if (settingsPage.data.length > 0) {
    for (const setting of settingsPage.data) {
      TestValidator.predicate(
        "setting active status",
        setting.is_active === true,
      );
    }
  }
  // Validate setting structure integrity
  if (settingsPage.data.length > 0) {
    const setting = settingsPage.data[0];
    TestValidator.predicate("has setting key", setting.setting_key.length > 0);
    TestValidator.predicate("has value type", setting.value_type.length > 0);
    TestValidator.predicate("has description", setting.description.length > 0);
  }
  // Validate expected value types are present
  const validValueTypes = ["string", "boolean", "int", "double", "uri"];
  if (settingsPage.data.length > 0) {
    for (const setting of settingsPage.data) {
      TestValidator.predicate(
        "valid value type",
        validValueTypes.includes(setting.value_type),
      );
    }
  }
}
