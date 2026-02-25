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

/**
 * E2E test for order item snapshot filtering, pagination, and sorting edge cases.
 *
 * Covers:
 * - Administrator authentication
 * - Filtering by very short substring matches
 * - Filtering by partial variant SKU
 * - Extreme pagination values: page=1, limit=100
 * - Sorting ascending and descending by product name and creation timestamp
 * - Empty result scenarios
 */
export async function test_api_order_item_snapshot_filter_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(12) + "@example.com",
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Set Authorization header for further requests
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Basic filters and sorts for tests
  const filters = [
    // very short substring productName filter
    { productName: "a" },
    // very short substring sellerShopName filter
    { sellerShopName: "e" },
    // partial variantSku filter
    { variantSku: "12" },
    // page 1, limit 100
    { page: 1, limit: 100 },
  ];
  // Test ascending and descending sorting
  const sorts: (
    | "created_at"
    | "-created_at"
    | "product_name"
    | "-product_name"
  )[] = ["product_name", "-product_name", "created_at", "-created_at"];
  // Run tests iteratively
  for (const filter of filters) {
    for (const sort of sorts) {
      const response =
        await api.functional.shoppingMall.administrator.orderItemSnapshots.index(
          adminConnection,
          {
            body: {
              ...filter,
              sort,
              page: filter.page ?? 1,
              limit: filter.limit ?? 10,
            },
          },
        );
      typia.assert(response);
      // Validate empty results and valid pagination info
      TestValidator.predicate(
        "Response pagination current page >= 1",
        response.pagination.current >= 1,
      );
      TestValidator.predicate(
        "Response pagination limit <= 100",
        response.pagination.limit <= 100,
      );
      // If no data, assert empty array
      if (response.data.length === 0) {
        TestValidator.equals("Response data array is empty", response.data, []);
      } else {
        // If data present, validate order by sort field
        if (sort === "product_name" || sort === "-product_name") {
          const ascending = sort === "product_name";
          const arr = response.data.map((item) =>
            item.productName.toLowerCase(),
          );
          const sorted = [...arr].sort();
          if (!ascending) sorted.reverse();
          TestValidator.equals("Data sorted by product name", arr, sorted);
        } else if (sort === "created_at" || sort === "-created_at") {
          const ascending = sort === "created_at";
          const arr = response.data.map((item) => item.createdAt);
          const sorted = [...arr].sort();
          if (!ascending) sorted.reverse();
          TestValidator.equals("Data sorted by createdAt", arr, sorted);
        }
      }
    }
  }
}
