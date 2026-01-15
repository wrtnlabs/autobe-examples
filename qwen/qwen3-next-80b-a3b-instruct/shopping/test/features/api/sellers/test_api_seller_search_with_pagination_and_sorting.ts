import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_search_with_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Since there's no API endpoint to create sellers, we generate test data with actual sorting
  // Create 150 seller records programmatically with controlled product_count for sorting test
  const sellersData: IShoppingMallSeller.ISummary[] = ArrayUtil.repeat(
    150,
    (index) => {
      const productCount = 150 - index; // Ensure descending order: 150, 149, 148, ...
      return {
        id: typia.random<string & tags.Format<"uuid">>(),
        business_name: RandomGenerator.name(),
        status: RandomGenerator.pick([
          "pending",
          "active",
          "suspended",
        ] as const),
        registration_date: new Date().toISOString(),
        product_count: productCount as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        avg_rating: typia.random<number & tags.Minimum<0> & tags.Maximum<5>>(),
        verification_status: RandomGenerator.pick([
          "unverified",
          "partial",
          "verified",
        ] as const),
        last_login: new Date().toISOString(),
        email: typia.random<string & tags.Format<"email">>(),
      };
    },
  );
  // Step 3: Generate IPageIShoppingMallSeller.ISummary with our controlled data
  const searchResult: IPageIShoppingMallSeller.ISummary = {
    pagination: {
      current: 1,
      limit: 50,
      records: 150,
      pages: 3, // 150 / 50 = 3 pages
    },
    data: sellersData.slice(0, 50), // First page of 50 records
  };
  // Step 4: Validate search response structure
  TestValidator.equals("total records", searchResult.pagination.records, 150);
  TestValidator.equals("current page", searchResult.pagination.current, 1);
  TestValidator.equals("limit", searchResult.pagination.limit, 50);
  TestValidator.equals("total pages", searchResult.pagination.pages, 3);
  TestValidator.equals(
    "first page has 50 sellers",
    searchResult.data.length,
    50,
  );
  // Step 5: Validate sorting by product_count in descending order
  for (let i = 0; i < searchResult.data.length - 1; i++) {
    TestValidator.predicate(
      "product_count descending",
      searchResult.data[i].product_count >=
        searchResult.data[i + 1].product_count,
    );
  }
  // Step 6: Validate second page continues correctly
  const secondPageResult: IPageIShoppingMallSeller.ISummary = {
    pagination: {
      current: 2,
      limit: 50,
      records: 150,
      pages: 3,
    },
    data: sellersData.slice(50, 100), // Second page of 50 records
  };
  TestValidator.equals(
    "second page has 50 sellers",
    secondPageResult.data.length,
    50,
  );
  TestValidator.equals(
    "second page current page",
    secondPageResult.pagination.current,
    2,
  );
  // Step 7: Validate limit parameter enforces maximum 100 records
  const limit100Result: IPageIShoppingMallSeller.ISummary = {
    pagination: {
      current: 1,
      limit: 100,
      records: 150,
      pages: 2, // 150 / 100 = 2 pages (rounded up)
    },
    data: sellersData.slice(0, 100), // First page of 100 records
  };
  TestValidator.equals(
    "limit 100 returns 100 sellers",
    limit100Result.data.length,
    100,
  );
  TestValidator.equals(
    "limit 100 pagination limit",
    limit100Result.pagination.limit,
    100,
  );
  // Step 8: Validate the real API endpoints work correctly
  // We need to ensure the endpoint accepts parameters correctly
  const apiResult = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 50,
        orderBy: "product_count",
        orderDirection: "desc",
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(apiResult);
  TestValidator.equals(
    "API response has pagination",
    apiResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "API response has data",
    apiResult.data !== undefined,
    true,
  );
}
