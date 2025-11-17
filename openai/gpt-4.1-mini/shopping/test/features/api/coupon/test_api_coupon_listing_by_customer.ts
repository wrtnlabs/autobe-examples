import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCoupon";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_coupon_listing_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration (join) to authenticate and obtain token
  const customerEmail = `${RandomGenerator.alphabets(6)}@example.com`;
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "StrongP@ssw0rd!",
      href: "https://example.com/register",
      referrer: "https://google.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Coupon listing with default parameters
  const page1 = await api.functional.shoppingMall.customer.coupons.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "Page 1 has pagination information",
    page1.pagination !== undefined && typeof page1.pagination === "object",
  );
  TestValidator.predicate(
    "Page 1 data array exists",
    Array.isArray(page1.data),
  );

  // 3. Coupon listing with page=2, pageSize=5
  const page2 = await api.functional.shoppingMall.customer.coupons.index(
    connection,
    {
      body: {
        page: 2,
        pageSize: 5,
      } satisfies IShoppingMallCoupon.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "Page 2 current page equals 2",
    page2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "Page 2 data array length is less or equal to pageSize 5",
    page2.data.length <= 5,
  );

  // 4. Coupon listing filtered by coupon code
  if (page1.data.length > 0) {
    const sampleCode = page1.data[0].code;
    const filteredByCode =
      await api.functional.shoppingMall.customer.coupons.index(connection, {
        body: {
          code: sampleCode,
        } satisfies IShoppingMallCoupon.IRequest,
      });
    typia.assert(filteredByCode);
    TestValidator.predicate(
      "Filtered coupons contain only the requested code",
      filteredByCode.data.every((coupon) => coupon.code === sampleCode),
    );
  }

  // 5. Coupon listing filtered by coupon type and including soft deleted
  if (page1.data.length > 0) {
    const sampleType = page1.data[0].type;
    const filteredByTypeAndDeleted =
      await api.functional.shoppingMall.customer.coupons.index(connection, {
        body: {
          type: sampleType,
          isDeleted: true,
        } satisfies IShoppingMallCoupon.IRequest,
      });
    typia.assert(filteredByTypeAndDeleted);
    TestValidator.predicate(
      "Filtered coupons have correct type",
      filteredByTypeAndDeleted.data.every(
        (coupon) => coupon.type === sampleType,
      ),
    );
  }

  // 6. Coupon listing sorted by discount value descending
  const sortedByDiscountDesc =
    await api.functional.shoppingMall.customer.coupons.index(connection, {
      body: {
        sortBy: "discount_value",
        sortOrder: "desc",
      } satisfies IShoppingMallCoupon.IRequest,
    });
  typia.assert(sortedByDiscountDesc);
  TestValidator.predicate(
    "Coupons are sorted in descending order by discount_value",
    sortedByDiscountDesc.data.every(
      (coupon, i, arr) =>
        i === 0 || coupon.discount_value <= arr[i - 1].discount_value,
    ),
  );
}
