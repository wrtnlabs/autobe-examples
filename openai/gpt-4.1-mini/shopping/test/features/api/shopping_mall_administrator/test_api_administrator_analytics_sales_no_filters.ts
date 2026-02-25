import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_analytics_sales_no_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
    },
  });
  typia.assert(admin);
  adminConnection.headers = {
    Authorization: `Bearer ${admin.token.access}`,
  };
  // 2. Request sales analytics without any filters
  const salesResponse =
    await api.functional.shoppingMall.administrator.analytics.sales.index(
      adminConnection,
      { body: {} satisfies IShoppingMallSale.IRequest },
    );
  typia.assert(salesResponse);
  // 3. Validate response structure and pagination correctness
  const { pagination, data } = salesResponse;
  // Pagination must have sensible values
  TestValidator.predicate(
    "pagination current page is positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination pages is zero or positive",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is zero or positive",
    pagination.records >= 0,
  );
  // Pagination pages should equal ceil(records / limit) or zero when records==0
  TestValidator.equals(
    "pagination pages calculated correctly",
    pagination.pages,
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit),
  );
  // Data array length cannot exceed limit
  TestValidator.predicate(
    "data length not exceed limit",
    data.length <= pagination.limit,
  );
  // Each sale summary should have valid UUID and non-empty name
  for (const sale of data) {
    typia.assert(sale);
    TestValidator.predicate(
      "sale id is non-empty uuid",
      typeof sale.id === "string" && sale.id.length === 36,
    );
    TestValidator.predicate(
      "sale name is non-empty",
      typeof sale.name === "string" && sale.name.length > 0,
    );
  }
  // 4. Ensure unauthorized access is denied
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.analytics.sales.index(
        unauthorizedConnection,
        { body: {} satisfies IShoppingMallSale.IRequest },
      );
    },
  );
}
