import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_setting_search_with_pattern_and_inactive(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Search system settings with pattern matching for 'payment.*' pattern
  // The search parameter uses LIKE operator, so we'll use wildcard pattern
  const searchRequest = {
    search: "payment%", // Pattern match for keys starting with 'payment'
    is_active: false, // Explicitly include inactive settings
    page: 1,
    limit: 10,
  } satisfies IEcommerceSystemSetting.IRequest;
  const response =
    await api.functional.ecommerce.superAdministrator.system_settings.index(
      adminConnection,
      { body: searchRequest },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "response has pagination",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    response.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.equals(
    "response has data array",
    Array.isArray(response.data),
    true,
  );
  // If data is returned, validate individual items
  if (response.data.length > 0) {
    for (const setting of response.data) {
      TestValidator.predicate(
        "setting has setting_key",
        typeof setting.setting_key === "string",
      );
      TestValidator.predicate(
        "setting has value_type",
        typeof setting.value_type === "string",
      );
      TestValidator.predicate(
        "setting has is_active",
        typeof setting.is_active === "boolean",
      );
      TestValidator.predicate(
        "setting has description",
        typeof setting.description === "string",
      );
      // Verify the setting matches the search pattern (starts with 'payment')
      TestValidator.predicate(
        "setting key starts with payment pattern",
        setting.setting_key.toLowerCase().startsWith("payment"),
      );
    }
  }
  // Validate that inactive settings are properly included
  // Since we explicitly requested is_active=false, check if some are inactive
  TestValidator.predicate(
    "search included inactive settings as requested",
    response.data.length === 0 ||
      response.data.some((setting) => setting.is_active === false),
  );
}
