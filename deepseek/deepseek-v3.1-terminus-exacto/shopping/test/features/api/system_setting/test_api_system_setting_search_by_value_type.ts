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

export async function test_api_system_setting_search_by_value_type(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
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
  // Test supported value types: string, boolean, int, double, uri
  const valueTypes = ["string", "boolean", "int", "double", "uri"] as const;
  for (const valueType of valueTypes) {
    const filteredSettings =
      await api.functional.ecommerce.superAdministrator.system_settings.index(
        adminConnection,
        {
          body: {
            value_type: valueType,
            page: 1,
            limit: 10,
          } satisfies IEcommerceSystemSetting.IRequest,
        },
      );
    typia.assert(filteredSettings);
    // Validate all returned settings have the correct value_type
    for (const setting of filteredSettings.data) {
      TestValidator.equals(
        `value_type should be ${valueType}`,
        setting.value_type,
        valueType,
      );
    }
    // Validate pagination structure
    TestValidator.predicate(
      `pagination should have valid structure for ${valueType}`,
      filteredSettings.pagination.records >= 0 &&
        filteredSettings.pagination.pages >= 0 &&
        filteredSettings.pagination.current === 1 &&
        filteredSettings.pagination.limit === 10,
    );
  }
}
