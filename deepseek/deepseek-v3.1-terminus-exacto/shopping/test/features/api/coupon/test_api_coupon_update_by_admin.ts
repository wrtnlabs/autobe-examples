import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test successful coupon update workflow by an authenticated administrator.
 * Validates that administrators can modify coupon properties including discount
 * values, validity periods, usage limits, and activation status. Tests that
 * coupon updates don't conflict with existing coupon usage and maintain data
 * integrity.
 */
export async function test_api_coupon_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ coupon_management: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create initial coupon
  const initialCouponData = {
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    discount_type: "percentage",
    discount_value: 10,
    minimum_order_amount: 50,
    maximum_discount: 100,
    usage_limit_per_customer: 5,
    total_usage_limit: 100,
    valid_from: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    valid_until: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
    is_active: true,
    shopping_mall_channel_id: undefined,
  } satisfies IShoppingMallCoupon.ICreate;

  const createdCoupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    { body: initialCouponData },
  );
  typia.assert(createdCoupon);

  // Step 3: Update coupon with modified properties
  const updateData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    discount_type: "fixed_amount",
    discount_value: 25,
    minimum_order_amount: 75,
    maximum_discount: undefined,
    usage_limit_per_customer: 3,
    total_usage_limit: 50,
    valid_from: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
    valid_until: new Date(Date.now() + 3456000000).toISOString(), // 40 days from now
    is_active: false,
    channel: undefined,
  } satisfies IShoppingMallCoupon.IUpdate;

  const updatedCoupon = await api.functional.shoppingMall.admin.coupons.update(
    connection,
    {
      couponCode: createdCoupon.code,
      body: updateData,
    },
  );
  typia.assert(updatedCoupon);

  // Step 4: Validate coupon was successfully updated
  TestValidator.equals(
    "coupon ID remains unchanged",
    updatedCoupon.id,
    createdCoupon.id,
  );
  TestValidator.equals(
    "coupon code remains unchanged",
    updatedCoupon.code,
    createdCoupon.code,
  );
  TestValidator.equals("name was updated", updatedCoupon.name, updateData.name);
  TestValidator.equals(
    "description was updated",
    updatedCoupon.description,
    updateData.description,
  );
  TestValidator.equals(
    "discount type was updated",
    updatedCoupon.discount_type,
    updateData.discount_type,
  );
  TestValidator.equals(
    "discount value was updated",
    updatedCoupon.discount_value,
    updateData.discount_value,
  );
  TestValidator.equals(
    "minimum order amount was updated",
    updatedCoupon.minimum_order_amount,
    updateData.minimum_order_amount,
  );
  TestValidator.equals(
    "usage limit per customer was updated",
    updatedCoupon.usage_limit_per_customer,
    updateData.usage_limit_per_customer,
  );
  TestValidator.equals(
    "total usage limit was updated",
    updatedCoupon.total_usage_limit,
    updateData.total_usage_limit,
  );
  TestValidator.equals(
    "valid from date was updated",
    updatedCoupon.valid_from,
    updateData.valid_from,
  );
  TestValidator.equals(
    "valid until date was updated",
    updatedCoupon.valid_until,
    updateData.valid_until,
  );
  TestValidator.equals(
    "is_active status was updated",
    updatedCoupon.is_active,
    updateData.is_active,
  );

  // Step 5: Validate data integrity
  TestValidator.predicate(
    "created_at timestamp unchanged",
    updatedCoupon.created_at === createdCoupon.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp was updated",
    updatedCoupon.updated_at !== createdCoupon.updated_at,
  );
  TestValidator.predicate(
    "used_count remains zero",
    updatedCoupon.used_count === 0,
  );
  TestValidator.predicate(
    "creator information preserved",
    updatedCoupon.creator !== undefined,
  );
  TestValidator.predicate(
    "administrator ID preserved",
    updatedCoupon.shopping_mall_administrator_id ===
      createdCoupon.shopping_mall_administrator_id,
  );
}
