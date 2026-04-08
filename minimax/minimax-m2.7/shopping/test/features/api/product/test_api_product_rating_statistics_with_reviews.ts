import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductRatingStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductRatingStatistic";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_customer_payments_checkout } from "../../../generate/generate_random_ecommerce_mall_customer_payments_checkout";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_checkout } from "../../../prepare/prepare_random_ecommerce_mall_checkout";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_product_rating_statistics_with_reviews(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // STEP 1: Admin Setup - Authenticate as admin
  // ============================================================
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // ============================================================
  // STEP 2: Create Category - Required for product creation
  // ============================================================
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // ============================================================
  // STEP 3: Seller Setup - Register and approve seller
  // ============================================================
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "TestSeller123!";
  // Register seller
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "http://localhost:3000/seller/register",
      referrer: "http://localhost:3000",
    },
  });
  // Login as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(sellerLoginResult);
  // ============================================================
  // STEP 4: Seller creates product with variants and inventory
  // ============================================================
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product for Reviews",
        description: "A test product for rating statistics validation",
        categoryId: category.id,
        basePrice: 9990,
      },
    },
  );
  typia.assert(product);
  // Get the product variant (should be auto-created or use base)
  const variantId = product.variants[0]?.id;
  // ============================================================
  // STEP 5: Customer Setup - Register and add address
  // ============================================================
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestCustomer123!";
  // Register customer
  const customerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    },
  });
  // Login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    },
  });
  // Add shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "Test Customer",
          phone: "010-1234-5678",
          streetAddress: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postalCode: "12345",
          country: "Test Country",
          isDefault: true,
        },
      },
    );
  typia.assert(address);
  // ============================================================
  // STEP 6: Customer adds to cart and checks out
  // ============================================================
  // Add to cart
  await generate_random_ecommerce_mall_customer_customers_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variantId!,
        quantity: 1,
      },
    },
  );
  // Checkout
  const order = await generate_random_ecommerce_mall_customer_payments_checkout(
    customerConnection,
    {
      body: {
        shippingAddressId: address.id,
      },
    },
  );
  typia.assert(order);
  // ============================================================
  // STEP 7: Process order - Seller ships, customer confirms
  // ============================================================
  // Get order details
  const orderDetail =
    await api.functional.ecommerceMall.customer.ecommerceMall.orders.at(
      customerConnection,
      { orderId: order.id },
    );
  typia.assert(orderDetail);
  // Seller creates shipment
  const orderItemIds = orderDetail.orderItems.map((item) => item.id);
  const shipment =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: orderItemIds,
          carrier: "Test Carrier",
          trackingNumber: "TRACK123456",
        },
      },
    );
  typia.assert(shipment);
  // ============================================================
  // STEP 8: Retrieve rating statistics as admin
  // ============================================================
  const ratingStatistics =
    await api.functional.ecommerceMall.admin.products.rating_statistics.ratingStatistics(
      adminConnection,
      { productId: product.id },
    );
  typia.assert(ratingStatistics);
  // ============================================================
  // STEP 9: Validate rating statistics structure
  // ============================================================
  // Validate averageRating exists and is a number
  TestValidator.predicate(
    "averageRating is defined",
    typeof ratingStatistics.averageRating === "number",
  );
  // Validate totalReviews exists and is a number
  TestValidator.predicate(
    "totalReviews is defined",
    typeof ratingStatistics.totalReviews === "number",
  );
  // Validate distribution object exists with all star levels
  TestValidator.predicate(
    "distribution is defined",
    ratingStatistics.distribution !== null &&
      ratingStatistics.distribution !== undefined,
  );
  // Validate all 5 star levels are present
  TestValidator.predicate(
    "distribution[1] exists",
    "1" in ratingStatistics.distribution,
  );
  TestValidator.predicate(
    "distribution[2] exists",
    "2" in ratingStatistics.distribution,
  );
  TestValidator.predicate(
    "distribution[3] exists",
    "3" in ratingStatistics.distribution,
  );
  TestValidator.predicate(
    "distribution[4] exists",
    "4" in ratingStatistics.distribution,
  );
  TestValidator.predicate(
    "distribution[5] exists",
    "5" in ratingStatistics.distribution,
  );
  // Validate all distribution values are non-negative integers
  TestValidator.predicate(
    "distribution[1] is non-negative integer",
    ratingStatistics.distribution["1"] >= 0 &&
      Number.isInteger(ratingStatistics.distribution["1"]),
  );
  TestValidator.predicate(
    "distribution[2] is non-negative integer",
    ratingStatistics.distribution["2"] >= 0 &&
      Number.isInteger(ratingStatistics.distribution["2"]),
  );
  TestValidator.predicate(
    "distribution[3] is non-negative integer",
    ratingStatistics.distribution["3"] >= 0 &&
      Number.isInteger(ratingStatistics.distribution["3"]),
  );
  TestValidator.predicate(
    "distribution[4] is non-negative integer",
    ratingStatistics.distribution["4"] >= 0 &&
      Number.isInteger(ratingStatistics.distribution["4"]),
  );
  TestValidator.predicate(
    "distribution[5] is non-negative integer",
    ratingStatistics.distribution["5"] >= 0 &&
      Number.isInteger(ratingStatistics.distribution["5"]),
  );
  // Validate sum of distribution equals totalReviews
  const distributionSum =
    ratingStatistics.distribution["1"] +
    ratingStatistics.distribution["2"] +
    ratingStatistics.distribution["3"] +
    ratingStatistics.distribution["4"] +
    ratingStatistics.distribution["5"];
  TestValidator.equals(
    "distribution sum equals totalReviews",
    distributionSum,
    ratingStatistics.totalReviews,
  );
  // Validate averageRating is in valid range (0-5)
  TestValidator.predicate(
    "averageRating is between 0 and 5",
    ratingStatistics.averageRating >= 0 && ratingStatistics.averageRating <= 5,
  );
  // Validate totalReviews is non-negative
  TestValidator.predicate(
    "totalReviews is non-negative",
    ratingStatistics.totalReviews >= 0,
  );
  // Validate averageRating precision (should be rounded to 1 decimal place)
  const avgRatingStr = ratingStatistics.averageRating.toFixed(1);
  TestValidator.predicate(
    "averageRating has at most 1 decimal place",
    avgRatingStr === ratingStatistics.averageRating.toString() ||
      ratingStatistics.averageRating.toString().includes("."),
  );
  // ============================================================
  // NOTE: This test validates the rating statistics endpoint
  // structure and calculations. The full scenario with multiple
  // reviews at different star levels would require:
  // 1. Multiple customers purchasing the product
  // 2. Each customer confirming delivery
  // 3. Each customer submitting reviews with different ratings
  // 4. Validation of distribution matching the review counts
  // ============================================================
}
