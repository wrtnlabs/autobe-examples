import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCoupon";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Comprehensive coupon search functionality validation for administrators.
 *
 * This test creates multiple test coupons with controlled configurations to
 * ensure predictable search results. It tests various filter combinations,
 * pagination, sorting, and search functionality to verify the coupon search API
 * works correctly.
 */
export async function test_api_coupon_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({ access: "full" }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create controlled test coupons with known distributions
  const coupons: IShoppingMallCoupon[] = [];

  // Create coupons with controlled properties for predictable testing
  const couponConfigs = [
    // Active percentage coupons
    { discountType: "percentage" as const, isActive: true, count: 3 },
    // Active fixed amount coupons
    { discountType: "fixed_amount" as const, isActive: true, count: 3 },
    // Active free shipping coupons
    { discountType: "free_shipping" as const, isActive: true, count: 2 },
    // Inactive percentage coupons
    { discountType: "percentage" as const, isActive: false, count: 2 },
    // Inactive fixed amount coupons
    { discountType: "fixed_amount" as const, isActive: false, count: 2 },
    // Inactive free shipping coupons
    { discountType: "free_shipping" as const, isActive: false, count: 1 },
  ];

  let couponIndex = 0;
  for (const config of couponConfigs) {
    for (let i = 0; i < config.count; i++) {
      const baseValue =
        config.discountType === "percentage"
          ? typia.random<
              number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50>
            >()
          : config.discountType === "fixed_amount"
            ? typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1000> &
                  tags.Maximum<5000>
              >()
            : typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1>
              >();

      const couponData = {
        code: `TEST${String(couponIndex + 1).padStart(2, "0")}${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
        name: `${config.discountType} coupon ${couponIndex + 1}`,
        description: `Test ${config.discountType} coupon ${config.isActive ? "active" : "inactive"}`,
        discount_type: config.discountType,
        discount_value: baseValue,
        minimum_order_amount:
          couponIndex % 3 === 0
            ? typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<5000> &
                  tags.Maximum<10000>
              >()
            : undefined,
        maximum_discount:
          config.discountType === "percentage"
            ? typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1000> &
                  tags.Maximum<3000>
              >()
            : undefined,
        usage_limit_per_customer:
          couponIndex % 4 === 0
            ? typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
              >()
            : undefined,
        total_usage_limit:
          couponIndex % 5 === 0
            ? typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<10> &
                  tags.Maximum<50>
              >()
            : undefined,
        valid_from: new Date(Date.now() - 86400000 * couponIndex).toISOString(),
        valid_until: new Date(
          Date.now() + 86400000 * (couponIndex + 30),
        ).toISOString(),
        is_active: config.isActive,
        shopping_mall_channel_id: undefined,
      } satisfies IShoppingMallCoupon.ICreate;

      const coupon: IShoppingMallCoupon =
        await api.functional.shoppingMall.admin.coupons.create(connection, {
          body: couponData,
        });
      typia.assert(coupon);
      coupons.push(coupon);
      couponIndex++;
    }
  }

  // Step 3: Test basic search functionality with known counts
  const activeCouponsCount = coupons.filter((c) => c.is_active).length;
  const percentageCouponsCount = coupons.filter(
    (c) => c.discount_type === "percentage",
  ).length;
  const fixedAmountCouponsCount = coupons.filter(
    (c) => c.discount_type === "fixed_amount",
  ).length;
  const freeShippingCouponsCount = coupons.filter(
    (c) => c.discount_type === "free_shipping",
  ).length;

  // Test search by discount type - percentage
  const percentageSearch: IPageIShoppingMallCoupon.ISummary =
    await api.functional.shoppingMall.admin.coupons.index(connection, {
      body: {
        discount_type: "percentage",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCoupon.IRequest,
    });
  typia.assert(percentageSearch);
  TestValidator.equals(
    "percentage coupons count matches",
    percentageSearch.data.length,
    Math.min(percentageCouponsCount, 10),
  );

  // Validate all returned coupons are percentage type
  for (const coupon of percentageSearch.data) {
    TestValidator.equals(
      "percentage search returns only percentage coupons",
      coupon.discount_type,
      "percentage",
    );
  }

  // Test search by discount type - fixed_amount
  const fixedAmountSearch: IPageIShoppingMallCoupon.ISummary =
    await api.functional.shoppingMall.admin.coupons.index(connection, {
      body: {
        discount_type: "fixed_amount",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCoupon.IRequest,
    });
  typia.assert(fixedAmountSearch);
  TestValidator.equals(
    "fixed amount coupons count matches",
    fixedAmountSearch.data.length,
    Math.min(fixedAmountCouponsCount, 10),
  );

  // Test search by active status
  const activeSearch: IPageIShoppingMallCoupon.ISummary =
    await api.functional.shoppingMall.admin.coupons.index(connection, {
      body: {
        is_active: true,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallCoupon.IRequest,
    });
  typia.assert(activeSearch);
  TestValidator.equals(
    "active coupons count matches",
    activeSearch.data.length,
    Math.min(activeCouponsCount, 20),
  );

  // Validate all returned coupons are active
  for (const coupon of activeSearch.data) {
    TestValidator.predicate(
      "active search returns only active coupons",
      coupon.is_active,
    );
  }

  // Test pagination functionality
  const pageSize = 5;
  const totalPages = Math.ceil(coupons.length / pageSize);

  const page1Search: IPageIShoppingMallCoupon.ISummary =
    await api.functional.shoppingMall.admin.coupons.index(connection, {
      body: {
        page: 1,
        limit: pageSize,
      } satisfies IShoppingMallCoupon.IRequest,
    });
  typia.assert(page1Search);
  TestValidator.equals(
    "page 1 has correct item count",
    page1Search.data.length,
    Math.min(pageSize, coupons.length),
  );

  // Only test page 2 if there are enough coupons
  if (totalPages >= 2) {
    const page2Search: IPageIShoppingMallCoupon.ISummary =
      await api.functional.shoppingMall.admin.coupons.index(connection, {
        body: {
          page: 2,
          limit: pageSize,
        } satisfies IShoppingMallCoupon.IRequest,
      });
    typia.assert(page2Search);
    TestValidator.predicate("page 2 has items", page2Search.data.length > 0);
  }

  // Verify pagination metadata
  TestValidator.predicate(
    "pagination metadata is valid",
    page1Search.pagination.current === 1 &&
      page1Search.pagination.limit === pageSize &&
      page1Search.pagination.records === coupons.length &&
      page1Search.pagination.pages === totalPages,
  );

  // Test sorting functionality
  const sortedByCreatedAt: IPageIShoppingMallCoupon.ISummary =
    await api.functional.shoppingMall.admin.coupons.index(connection, {
      body: {
        order_by: "created_at",
        order_direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCoupon.IRequest,
    });
  typia.assert(sortedByCreatedAt);
  TestValidator.predicate(
    "sorted search returns results",
    sortedByCreatedAt.data.length > 0,
  );

  // Test complex filter combinations
  const activePercentageCoupons = coupons.filter(
    (c) => c.is_active && c.discount_type === "percentage",
  ).length;

  const complexSearch: IPageIShoppingMallCoupon.ISummary =
    await api.functional.shoppingMall.admin.coupons.index(connection, {
      body: {
        discount_type: "percentage",
        is_active: true,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCoupon.IRequest,
    });
  typia.assert(complexSearch);
  TestValidator.equals(
    "complex search returns correct count",
    complexSearch.data.length,
    Math.min(activePercentageCoupons, 10),
  );

  // Validate complex search results match ALL criteria
  for (const coupon of complexSearch.data) {
    TestValidator.equals(
      "complex search coupon is percentage type",
      coupon.discount_type,
      "percentage",
    );
    TestValidator.predicate(
      "complex search coupon is active",
      coupon.is_active,
    );
  }

  // Test date range filtering - coupons valid in the future
  const futureDate = new Date(Date.now() + 86400000); // Tomorrow
  const futureCoupons = coupons.filter(
    (c) => new Date(c.valid_until) > futureDate,
  ).length;

  const dateRangeSearch: IPageIShoppingMallCoupon.ISummary =
    await api.functional.shoppingMall.admin.coupons.index(connection, {
      body: {
        valid_until_min: futureDate.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCoupon.IRequest,
    });
  typia.assert(dateRangeSearch);
  TestValidator.equals(
    "future coupons search returns correct count",
    dateRangeSearch.data.length,
    Math.min(futureCoupons, 10),
  );

  // Test search by coupon code (exact match)
  if (coupons.length > 0) {
    const testCoupon = coupons[0];
    const codeSearch: IPageIShoppingMallCoupon.ISummary =
      await api.functional.shoppingMall.admin.coupons.index(connection, {
        body: {
          search: testCoupon.code,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCoupon.IRequest,
      });
    typia.assert(codeSearch);
    TestValidator.predicate(
      "exact code search returns matching coupon",
      codeSearch.data.some((c) => c.code === testCoupon.code),
    );
  }

  // Test search by coupon name (partial match)
  if (coupons.length > 0) {
    const testCoupon = coupons.find((c) => c.name.includes("percentage"));
    if (testCoupon) {
      const nameSearch: IPageIShoppingMallCoupon.ISummary =
        await api.functional.shoppingMall.admin.coupons.index(connection, {
          body: {
            search: "percentage",
            page: 1,
            limit: 10,
          } satisfies IShoppingMallCoupon.IRequest,
        });
      typia.assert(nameSearch);
      TestValidator.predicate(
        "name search returns matching coupons",
        nameSearch.data.some((c) =>
          c.name.toLowerCase().includes("percentage"),
        ),
      );
    }
  }

  // Test empty search results with impossible criteria
  const impossibleSearch: IPageIShoppingMallCoupon.ISummary =
    await api.functional.shoppingMall.admin.coupons.index(connection, {
      body: {
        discount_type: "percentage",
        is_active: false,
        used_count_min: 1000, // No coupons have this high usage
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCoupon.IRequest,
    });
  typia.assert(impossibleSearch);
  TestValidator.equals(
    "impossible search returns empty results",
    impossibleSearch.data.length,
    0,
  );

  // Test free shipping coupons specifically
  const freeShippingSearch: IPageIShoppingMallCoupon.ISummary =
    await api.functional.shoppingMall.admin.coupons.index(connection, {
      body: {
        discount_type: "free_shipping",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCoupon.IRequest,
    });
  typia.assert(freeShippingSearch);
  TestValidator.equals(
    "free shipping coupons count matches",
    freeShippingSearch.data.length,
    Math.min(freeShippingCouponsCount, 10),
  );

  for (const coupon of freeShippingSearch.data) {
    TestValidator.equals(
      "free shipping search returns only free shipping coupons",
      coupon.discount_type,
      "free_shipping",
    );
  }
}
