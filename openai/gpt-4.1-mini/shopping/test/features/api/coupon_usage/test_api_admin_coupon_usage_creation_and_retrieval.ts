import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCouponUsage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponUsage";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

export async function test_api_admin_coupon_usage_creation_and_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass1234!",
    href: "https://example.com/admin",
    referrer: "https://example.com/",
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create coupon usage
  const createBody = {
    shopping_mall_coupon_id: typia.random<string & tags.Format<"uuid">>(),
    used_at: new Date().toISOString(),
    order_id: null,
  } satisfies IShoppingMallCouponUsage.ICreate;
  const createdUsage: IShoppingMallCouponUsage =
    await api.functional.shoppingMall.admin.couponUsages.create(connection, {
      body: createBody,
    });
  typia.assert(createdUsage);

  // 3. Retrieve coupon usages filtering by coupon_id
  const searchBody = {
    coupon_id: createdUsage.shopping_mall_coupon.id,
    page: 1,
    limit: 10,
    sort_by: "used_at",
    order_direction: "desc",
  } satisfies IShoppingMallCouponUsage.IRequest;
  const paginatedResult: IPageIShoppingMallCouponUsage.ISummary =
    await api.functional.shoppingMall.admin.couponUsages.index(connection, {
      body: searchBody,
    });
  typia.assert(paginatedResult);

  // Validate that the created coupon usage is included in the paginated results
  const foundUsage = paginatedResult.data.find(
    (usage) => usage.id === createdUsage.id,
  );
  typia.assert(foundUsage!);

  TestValidator.predicate(
    "created coupon usage is contained in the search results",
    foundUsage !== undefined,
  );
  TestValidator.equals(
    "foundUsage coupon_id equals createdUsage coupon_id",
    foundUsage!.shopping_mall_coupon_id,
    createdUsage.shopping_mall_coupon.id,
  );
  TestValidator.equals(
    "foundUsage usage id matches createdUsage id",
    foundUsage!.id,
    createdUsage.id,
  );
}
