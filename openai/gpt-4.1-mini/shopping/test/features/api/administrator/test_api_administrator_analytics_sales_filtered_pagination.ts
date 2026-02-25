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

export async function test_api_administrator_analytics_sales_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: { password: "Password1234" }, // Use strong password, email random
  });
  typia.assert(admin);
  // 2. Compose filtered sales analytics request
  // Define valid date range for filtering
  const fromDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const toDate = new Date().toISOString();
  // To test filtering by seller and category, generate or pick arbitrary UUIDs
  // Since we don't have utility functions to create sellers or categories here,
  // we'll just test filtering by using sample valid UUID strings (dummy but valid format)
  const sampleSellerId = typia.random<string & tags.Format<"uuid">>();
  const sampleCategoryCode = "electronics";
  // Test multiple pages and limits
  const page = 1;
  const limit = 5;
  // Compose filtered request body
  const requestBody: IShoppingMallSale.IRequest = {
    // Using categoryCode filter
    categoryCode: sampleCategoryCode,
    // Page and limit for pagination
    page: page,
    limit: limit,
    // Sort by newest
    sort: "newest",
  };
  // 3. Make filtered sales analytics query with authorized connection
  const response =
    await api.functional.shoppingMall.administrator.analytics.sales.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 4. Assertions for paginated data structure
  // Pagination
  TestValidator.predicate(
    "pagination current page",
    response.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit",
    response.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate each item in data array
  response.data.forEach((sale) => {
    typia.assert(sale);
    // Assert required fields exist and types
    TestValidator.predicate(
      "sale id presence",
      typeof sale.id === "string" && sale.id.length > 0,
    );
    TestValidator.predicate(
      "sale has seller",
      sale.seller !== undefined && sale.seller !== null,
    );
    TestValidator.predicate(
      "sale has category",
      sale.category !== undefined && sale.category !== null,
    );
  });
  // 6. Test unauthorized access: Attempt request without authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized user cannot access analytics",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.analytics.sales.index(
        unauthorizedConnection,
        { body: requestBody },
      );
    },
  );
  // 7. Test pagination and sorting behavior
  // Query second page with different sort and limit
  const page2Request: IShoppingMallSale.IRequest = {
    page: 2,
    limit: 3,
    sort: "price_asc",
  };
  const responsePage2 =
    await api.functional.shoppingMall.administrator.analytics.sales.index(
      adminConnection,
      { body: page2Request },
    );
  typia.assert(responsePage2);
  TestValidator.predicate(
    "pagination current page is 2",
    responsePage2.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination limit is 3",
    responsePage2.pagination.limit === 3,
  );
  TestValidator.predicate(
    "pagination records count non-negative",
    responsePage2.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count non-negative",
    responsePage2.pagination.pages >= 0,
  );
  // Sorting validation: prices in ascending order
  for (let i = 1; i < responsePage2.data.length; i++) {
    TestValidator.predicate(
      `sorted price ascending at index ${i}`,
      responsePage2.data[i - 1].basePrice <= responsePage2.data[i].basePrice,
    );
  }
}
