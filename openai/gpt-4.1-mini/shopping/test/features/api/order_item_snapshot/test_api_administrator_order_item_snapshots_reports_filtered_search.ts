import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_order_item_snapshots_reports_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 2: Search order item snapshots report with filters for product name and variant SKU
  // 1. Authenticate as administrator by joining
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass1234",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Prepare filter parameters: productName substring and exact variantSku
  const productNameFilter = "test";
  const variantSkuFilter = "SKU123456";
  const requestBody: IShoppingMallOrderItemSnapshot.IRequest = {
    productName: productNameFilter,
    variantSku: variantSkuFilter,
    page: 1,
    limit: 10,
    sort: "-created_at",
  };
  // 3. Send a PATCH request with the filter parameters
  const response =
    await api.functional.shoppingMall.administrator.orderItemSnapshots.reports.index(
      adminConnection,
      { body: requestBody },
    );
  // 4. Validate response structure and type
  typia.assert(response);
  TestValidator.predicate(
    "pagination current page",
    response.pagination.current === 1,
  );
  TestValidator.predicate("pagination limit", response.pagination.limit === 10);
  TestValidator.predicate("pagination pages", response.pagination.pages >= 0);
  TestValidator.predicate(
    "pagination records",
    response.pagination.records >= 0,
  );
  // 5. Validate each returned order item snapshot matches the filter criteria
  for (const snapshot of response.data) {
    TestValidator.predicate(
      `productName includes filter: ${productNameFilter}`,
      snapshot.productName.includes(productNameFilter),
    );
    TestValidator.equals(
      `variantSku matches filter: ${variantSkuFilter}`,
      snapshot.variantSku,
      variantSkuFilter,
    );
  }
}
