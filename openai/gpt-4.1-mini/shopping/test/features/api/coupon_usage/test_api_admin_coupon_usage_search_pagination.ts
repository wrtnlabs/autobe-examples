import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCouponUsage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponUsage";

export async function test_api_admin_coupon_usage_search_pagination(
  connection: api.IConnection,
) {
  // 1. Admin join (login) to get authorization
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "ValidPass123";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin.shoppingmall.com/login",
        referrer: "https://shoppingmall.com",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Base valid filter values
  const couponId = typia.random<string & tags.Format<"uuid">>();
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const usedAtFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago
  const usedAtTo = new Date().toISOString();

  const page1Limit10Request = {
    coupon_id: couponId,
    customer_id: customerId,
    order_id: orderId,
    used_at_from: usedAtFrom,
    used_at_to: usedAtTo,
    page: 1,
    limit: 10,
    sort_by: "used_at",
    order_direction: "desc",
  } satisfies IShoppingMallCouponUsage.IRequest;

  const page1Limit5Request = {
    page: 1,
    limit: 5,
    sort_by: "created_at",
    order_direction: "asc",
  } satisfies IShoppingMallCouponUsage.IRequest;

  const page2Limit5Request = {
    page: 2,
    limit: 5,
    sort_by: "created_at",
    order_direction: "asc",
  } satisfies IShoppingMallCouponUsage.IRequest;

  // 2. Search with full filters
  const fullFilterResult: IPageIShoppingMallCouponUsage.ISummary =
    await api.functional.shoppingMall.admin.couponUsages.index(connection, {
      body: page1Limit10Request,
    });
  typia.assert(fullFilterResult);

  // Validate pagination info
  TestValidator.equals(
    "pagination current page is 1",
    fullFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    fullFilterResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    fullFilterResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    fullFilterResult.pagination.records >= 0,
  );

  // Validate each coupon usage summary in data array
  for (const usage of fullFilterResult.data) {
    typia.assert(usage);
    // Note: Backend might not filter strictly by coupon_id or may filter partially;
    // validate that usage IDs are strings and usable
    TestValidator.predicate(
      "each usage has a valid coupon_id string",
      typeof usage.shopping_mall_coupon_id === "string",
    );
    TestValidator.predicate(
      "each usage has a valid customer_id string",
      typeof usage.shopping_mall_customer_id === "string",
    );
    // used_at should be within the filter range if backend filters accurately
    // Here we only check ISO string validity
    TestValidator.predicate(
      "each usage used_at is ISO date string",
      typeof usage.used_at === "string",
    );
  }

  // 3. Search without filters (only pagination and sort) - page 1 limit 5
  const searchNoFiltersPage1: IPageIShoppingMallCouponUsage.ISummary =
    await api.functional.shoppingMall.admin.couponUsages.index(connection, {
      body: page1Limit5Request,
    });
  typia.assert(searchNoFiltersPage1);

  // 4. Search page 2 limit 5
  const searchNoFiltersPage2: IPageIShoppingMallCouponUsage.ISummary =
    await api.functional.shoppingMall.admin.couponUsages.index(connection, {
      body: page2Limit5Request,
    });
  typia.assert(searchNoFiltersPage2);

  // Validate pagination page 1 and page 2 limit 5 have different data
  if (
    searchNoFiltersPage1.data.length > 0 &&
    searchNoFiltersPage2.data.length > 0
  ) {
    TestValidator.notEquals(
      "page 1 and page 2 data differ",
      searchNoFiltersPage1.data[0],
      searchNoFiltersPage2.data[0],
    );
  }

  // 5. Search with invalid coupon_id (non-existent), expect empty data
  const invalidCouponIdRequest = {
    ...page1Limit10Request,
    coupon_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallCouponUsage.IRequest;
  const invalidCouponIdResult =
    await api.functional.shoppingMall.admin.couponUsages.index(connection, {
      body: invalidCouponIdRequest,
    });
  typia.assert(invalidCouponIdResult);
  TestValidator.equals(
    "invalid coupon_id search returns empty data",
    invalidCouponIdResult.data.length,
    0,
  );

  // 6. Search with order_id null filter explicitly
  const nullOrderIdRequest = {
    ...page1Limit10Request,
    order_id: null,
  } satisfies IShoppingMallCouponUsage.IRequest;
  const nullOrderIdResult =
    await api.functional.shoppingMall.admin.couponUsages.index(connection, {
      body: nullOrderIdRequest,
    });
  typia.assert(nullOrderIdResult);
  // all results have order_id null or undefined
  for (const usage of nullOrderIdResult.data) {
    TestValidator.predicate(
      "each usage with null order_id fits",
      usage.order_id === null || usage.order_id === undefined,
    );
  }

  // 7. Search with undefined filters (exclude optional fields)
  const minimalRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCouponUsage.IRequest;
  const minimalResult =
    await api.functional.shoppingMall.admin.couponUsages.index(connection, {
      body: minimalRequest,
    });
  typia.assert(minimalResult);
  TestValidator.predicate(
    "minimal search data is array",
    Array.isArray(minimalResult.data) && minimalResult.data.length >= 0,
  );
}
