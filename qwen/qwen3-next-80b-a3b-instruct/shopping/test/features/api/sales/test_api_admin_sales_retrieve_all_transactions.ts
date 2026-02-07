import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_sales_retrieve_all_transactions(
  connection: api.IConnection,
): Promise<void> {
  // Admin queries sales data with no filters to retrieve a paginated list of all completed transactions. Verifies that the response contains all order records (non-deleted) and displays proper pagination metadata (current page, limit, records, pages) in IPageIShoppingMallOrder.ISummary. Validates that the response structure matches the IShoppingMallOrder.ISummary schema with no missing or extra fields.
  // 1. Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {}, // IShoppingMallAdmin.ILogin is an empty object
  });
  // 2. Retrieve all sales transactions with no filters (empty request body since IRequest is empty)
  const salesData = await api.functional.shoppingMall.admin.sales.index(
    adminConnection,
    {
      body: {}, // IShoppingMallOrder.IRequest is an empty object
    },
  );
  typia.assert(salesData);
  // 3. Validate response structure
  // Since IShoppingMallOrder.ISummary is an empty object ({}) in the schema,
  // we can only verify the overall structure: pagination and data array.
  // No property validation on the summary objects is possible as they have no properties defined.
  // Verify pagination is present and has the correct type
  TestValidator.equals(
    "pagination exists",
    typeof salesData.pagination,
    "object",
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(salesData.data),
    true,
  );
  // Verify pagination has the correct structure
  TestValidator.predicate(
    "current page is integer",
    typeof salesData.pagination.current === "number",
  );
  TestValidator.predicate(
    "limit is integer",
    typeof salesData.pagination.limit === "number",
  );
  TestValidator.predicate(
    "records is integer",
    typeof salesData.pagination.records === "number",
  );
  TestValidator.predicate(
    "pages is integer",
    typeof salesData.pagination.pages === "number",
  );
  // Verify pages is calculated correctly (if records > 0)
  if (salesData.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculated correctly",
      Math.ceil(salesData.pagination.records / salesData.pagination.limit) ===
        salesData.pagination.pages,
    );
  } else {
    TestValidator.equals(
      "pages is 0 when records is 0",
      salesData.pagination.pages,
      0,
    );
  }
  // Verify each item in data is an object (since IShoppingMallOrder.ISummary is {})
  salesData.data.forEach((item) => {
    TestValidator.equals("data item is object", typeof item, "object");
  });
}
