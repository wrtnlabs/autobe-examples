import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_customer_list_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // 2. Request customer list with pagination
  const request = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCustomer.IRequest;
  const result =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(result);
  // 3. Validate pagination structure
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate pagination calculation
  if (result.pagination.records > 0) {
    const expectedPages = Math.ceil(
      result.pagination.records / result.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation",
      result.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals("pages when no records", result.pagination.pages, 0);
  }
  // 5. Validate data array length matches pagination
  TestValidator.predicate(
    "data length does not exceed limit",
    result.data.length <= result.pagination.limit,
  );
}
