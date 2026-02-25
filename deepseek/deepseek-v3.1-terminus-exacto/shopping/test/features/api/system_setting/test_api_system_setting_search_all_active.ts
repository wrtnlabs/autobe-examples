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

export async function test_api_system_setting_search_all_active(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Search system settings with default parameters (empty request)
  const response =
    await api.functional.ecommerce.superAdministrator.system_settings.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceSystemSetting.IRequest,
      },
    );
  // Validate complete response structure
  typia.assert(response);
  // Validate pagination metadata structure and defaults
  TestValidator.predicate(
    "pagination metadata exists",
    () => response.pagination !== undefined,
  );
  TestValidator.equals(
    "current page defaults to 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    () => response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    () => response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    () =>
      response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // Validate data structure for each record (if any returned)
  for (const setting of response.data) {
    TestValidator.predicate(
      "setting_key is string",
      () => typeof setting.setting_key === "string",
    );
    TestValidator.predicate(
      "value_type is string",
      () => typeof setting.value_type === "string",
    );
    TestValidator.predicate(
      "is_active is boolean",
      () => typeof setting.is_active === "boolean",
    );
    TestValidator.predicate(
      "description is string",
      () => typeof setting.description === "string",
    );
    // Validate that only active settings are returned by default
    TestValidator.predicate("setting is active", () => setting.is_active);
  }
  // Validate pagination consistency - data length should be <= limit on non-final pages
  // On final page, data length should be records % limit (unless records is multiple of limit)
  if (response.pagination.current < response.pagination.pages) {
    TestValidator.equals(
      "data length equals limit on non-final pages",
      response.data.length,
      response.pagination.limit,
    );
  } else {
    TestValidator.predicate(
      "data length is valid on final page",
      () => response.data.length <= response.pagination.limit,
    );
    if (response.pagination.records % response.pagination.limit !== 0) {
      TestValidator.equals(
        "data length equals remainder on final page",
        response.data.length,
        response.pagination.records % response.pagination.limit,
      );
    }
  }
}
