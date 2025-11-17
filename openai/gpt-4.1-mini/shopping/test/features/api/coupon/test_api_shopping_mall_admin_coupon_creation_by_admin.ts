import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_shopping_mall_admin_coupon_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new administrator to get authorization JWT token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "password1234",
        href: "https://localhost/",
        referrer: "https://localhost/",
        ip: null,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a coupon using the authenticated admin connection
  const now = new Date();
  const startDate = now.toISOString();
  const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const couponCreateBody = {
    code: `CPN-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    type: "percentage",
    discount_value: Math.floor(Math.random() * 50) + 1, // 1~50 percent discount
    start_date: startDate,
    end_date: endDate,
  } satisfies IShoppingMallCoupon.ICreate;

  const coupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: couponCreateBody,
    });
  typia.assert(coupon);

  // 3. Validate response fields
  TestValidator.equals(
    "coupon code matches",
    coupon.code,
    couponCreateBody.code,
  );
  TestValidator.equals(
    "coupon type matches",
    coupon.type,
    couponCreateBody.type,
  );
  TestValidator.equals(
    "discount value matches",
    coupon.discount_value,
    couponCreateBody.discount_value,
  );
  TestValidator.equals(
    "start_date matches",
    coupon.start_date,
    couponCreateBody.start_date,
  );
  TestValidator.equals(
    "end_date matches",
    coupon.end_date,
    couponCreateBody.end_date,
  );
  TestValidator.predicate(
    "coupon id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      coupon.id,
    ),
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    typeof coupon.created_at === "string" && coupon.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    typeof coupon.updated_at === "string" && coupon.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", coupon.deleted_at, null);
}
