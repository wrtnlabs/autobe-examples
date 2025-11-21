import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test retrieval of coupon details using valid coupon code.
 *
 * This E2E test validates the complete coupon retrieval workflow:
 *
 * 1. Authenticate as administrator to establish authorization context
 * 2. Create a shopping channel for coupon creation context
 * 3. Generate a test coupon with comprehensive configuration
 * 4. Retrieve the coupon details using the coupon code
 * 5. Validate that all coupon properties match the creation data
 *
 * The test ensures that discount configuration, validity periods, usage limits,
 * and status information are correctly returned and match the creation
 * parameters.
 */
export async function test_api_coupon_retrieval_by_code(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({
        coupon_management: true,
        channel_management: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create shopping channel for coupon context
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        configuration: JSON.stringify({
          coupon_support: true,
          max_discount_rate: 50,
        }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create test coupon with comprehensive configuration
  const couponCode = RandomGenerator.alphaNumeric(10).toUpperCase();
  const currentDate = new Date();
  const validFrom = new Date(currentDate.getTime() + 3600000).toISOString(); // 1 hour from now
  const validUntil = new Date(
    currentDate.getTime() + 86400000 * 30,
  ).toISOString(); // 30 days from now

  const createdCoupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    {
      body: {
        code: couponCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        discount_type: "percentage",
        discount_value: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<50>
        >(),
        minimum_order_amount: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<50000>
        >(),
        maximum_discount: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<5000> &
            tags.Maximum<20000>
        >(),
        usage_limit_per_customer: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        total_usage_limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
        >(),
        valid_from: validFrom,
        valid_until: validUntil,
        is_active: true,
        shopping_mall_channel_id: channel.id,
      } satisfies IShoppingMallCoupon.ICreate,
    },
  );
  typia.assert(createdCoupon);

  // Step 4: Retrieve coupon details using the coupon code
  const retrievedCoupon = await api.functional.shoppingMall.coupons.at(
    connection,
    {
      couponCode: couponCode,
    },
  );
  typia.assert(retrievedCoupon);

  // Step 5: Validate that retrieved coupon matches created coupon
  TestValidator.equals(
    "coupon ID should match",
    retrievedCoupon.id,
    createdCoupon.id,
  );
  TestValidator.equals(
    "coupon code should match",
    retrievedCoupon.code,
    createdCoupon.code,
  );
  TestValidator.equals(
    "coupon name should match",
    retrievedCoupon.name,
    createdCoupon.name,
  );
  TestValidator.equals(
    "coupon description should match",
    retrievedCoupon.description,
    createdCoupon.description,
  );
  TestValidator.equals(
    "discount type should match",
    retrievedCoupon.discount_type,
    createdCoupon.discount_type,
  );
  TestValidator.equals(
    "discount value should match",
    retrievedCoupon.discount_value,
    createdCoupon.discount_value,
  );
  TestValidator.equals(
    "minimum order amount should match",
    retrievedCoupon.minimum_order_amount,
    createdCoupon.minimum_order_amount,
  );
  TestValidator.equals(
    "maximum discount should match",
    retrievedCoupon.maximum_discount,
    createdCoupon.maximum_discount,
  );
  TestValidator.equals(
    "usage limit per customer should match",
    retrievedCoupon.usage_limit_per_customer,
    createdCoupon.usage_limit_per_customer,
  );
  TestValidator.equals(
    "total usage limit should match",
    retrievedCoupon.total_usage_limit,
    createdCoupon.total_usage_limit,
  );
  TestValidator.equals(
    "valid from date should match",
    retrievedCoupon.valid_from,
    createdCoupon.valid_from,
  );
  TestValidator.equals(
    "valid until date should match",
    retrievedCoupon.valid_until,
    createdCoupon.valid_until,
  );
  TestValidator.equals(
    "active status should match",
    retrievedCoupon.is_active,
    createdCoupon.is_active,
  );
  TestValidator.equals(
    "used count should be zero",
    retrievedCoupon.used_count,
    0,
  );
  TestValidator.equals(
    "channel ID should match",
    retrievedCoupon.shopping_mall_channel_id,
    createdCoupon.shopping_mall_channel_id,
  );

  // Validate channel relationship
  TestValidator.predicate(
    "channel should be defined",
    retrievedCoupon.channel !== undefined,
  );
  if (retrievedCoupon.channel) {
    TestValidator.equals(
      "channel ID should match",
      retrievedCoupon.channel.id,
      channel.id,
    );
    TestValidator.equals(
      "channel name should match",
      retrievedCoupon.channel.name,
      channel.name,
    );
    TestValidator.equals(
      "channel code should match",
      retrievedCoupon.channel.code,
      channel.code,
    );
  }

  // Validate creator relationship
  TestValidator.predicate(
    "creator should be defined",
    retrievedCoupon.creator !== undefined,
  );
  if (retrievedCoupon.creator) {
    TestValidator.equals(
      "creator ID should match",
      retrievedCoupon.creator.id,
      adminAuth.administrator.id,
    );
    TestValidator.equals(
      "creator email should match",
      retrievedCoupon.creator.email,
      adminAuth.administrator.email,
    );
  }

  // Validate timestamp properties
  TestValidator.predicate(
    "created at should be valid date",
    !isNaN(Date.parse(retrievedCoupon.created_at)),
  );
  TestValidator.predicate(
    "updated at should be valid date",
    !isNaN(Date.parse(retrievedCoupon.updated_at)),
  );
  TestValidator.predicate(
    "created at should be before updated at",
    Date.parse(retrievedCoupon.created_at) <=
      Date.parse(retrievedCoupon.updated_at),
  );
}
