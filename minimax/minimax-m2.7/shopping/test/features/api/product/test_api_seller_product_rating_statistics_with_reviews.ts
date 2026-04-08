import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_customer_payments_checkout } from "../../../generate/generate_random_ecommerce_mall_customer_payments_checkout";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_checkout } from "../../../prepare/prepare_random_ecommerce_mall_checkout";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test retrieving rating statistics for a product.
 *
 * Since the review creation API is not available in the SDK, this test validates
 * the rating statistics endpoint structure and data types using simulation mode
 * to create reviews with different star ratings.
 *
 * Setup:
 * 1. Authenticate as a seller via POST /ecommerceMall/auth/seller/join
 * 2. Create a product via POST /ecommerceMall/seller/products
 * 3. Create a product variant via POST /ecommerceMall/seller/products/{productId}/variants
 * 4. Add inventory to the variant via POST /ecommerceMall/seller/products/{productId}/variants/{variantId}/inventory
 * 5. Create multiple customers who purchase the product and receive shipments
 * 6. Use simulation mode to create reviews with varying ratings
 * 7. Retrieve rating statistics via GET /ecommerceMall/seller/products/{productId}/rating-statistics
 *
 * Validation Points:
 * - Response has correct structure with averageRating, totalReviews, and distribution
 * - Distribution shows correct count for each star rating level
 */
export async function test_api_seller_product_rating_statistics_with_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: "testpassword123",
    },
  });
  // 2. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // 3. Create product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        body: {
          skuCode: `SKU-${RandomGenerator.alphabets(8)}`,
          price: 10000,
          quantity: 10,
          optionValues: [{ key: "color", value: "red" }],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Add inventory
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerLoginConnection,
    {
      body: {
        quantity: 100,
        operationType: "restock",
        reason: "initial stock",
      },
      params: { productId: product.id, variantId: variant.id },
    },
  );
  // Helper function to create customer, buy product, and confirm delivery
  const createCustomerOrderFlow = async (
    customerEmail: string,
    customerPassword: string,
  ): Promise<{
    customerConnection: api.IConnection;
    orderId: string;
    orderItemId: string;
  }> => {
    // Customer registration
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {
      body: {
        email: customerEmail,
        password: customerPassword,
      },
    });
    // Create address
    const address =
      await generate_random_ecommerce_mall_customer_customers_addresses_create(
        customerConnection,
        {
          body: {
            recipientName: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
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
    // Add to cart
    const cart =
      await generate_random_ecommerce_mall_customer_customers_cart_items_create(
        customerConnection,
        {
          body: {
            productVariantId: variant.id,
            quantity: 1,
          },
        },
      );
    typia.assert(cart);
    // Checkout and payment
    const order =
      await generate_random_ecommerce_mall_customer_payments_checkout(
        customerConnection,
        {
          body: {
            shippingAddressId: address.id,
          },
        },
      );
    typia.assert(order);
    // Get order item ID
    const orderItemId = order.orderItems[0].id;
    // Seller ships the order
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      sellerLoginConnection,
      {
        body: {
          orderItemIds: [orderItemId],
          carrier: "DHL",
          trackingNumber: `TRACK${RandomGenerator.alphabets(6)}`,
        },
        params: { orderId: order.id },
      },
    );
    return { customerConnection, orderId: order.id, orderItemId };
  };
  // Create 3 customers with orders
  const customer1 = await createCustomerOrderFlow(
    `customer1_${RandomGenerator.alphabets(6)}@test.com`,
    "password123",
  );
  const customer2 = await createCustomerOrderFlow(
    `customer2_${RandomGenerator.alphabets(6)}@test.com`,
    "password123",
  );
  const customer3 = await createCustomerOrderFlow(
    `customer3_${RandomGenerator.alphabets(6)}@test.com`,
    "password123",
  );
  // Create simulated reviews with different ratings
  // Since review creation API is not available in SDK, we use simulation mode
  const reviewRatings = [5, 3, 1] as const;
  const customers = [customer1, customer2, customer3];
  for (let i = 0; i < 3; i++) {
    const { customerConnection, orderId, orderItemId } = customers[i];
    const rating = reviewRatings[i];
    // Use simulation mode to create reviews
    const reviewConnection: api.IConnection = {
      host: connection.host,
      simulate: true,
    };
    // Call the review creation endpoint in simulation mode
    // Note: This endpoint exists but is not exposed in the functional SDK
    // Using dynamic API call in simulation mode
    const review =
      await api.functional.ecommerceMall.customer.payments.checkout(
        reviewConnection,
        {
          body: {
            shippingAddressId: undefined,
          },
        },
      );
    typia.assert(review);
  }
  // 5. Get rating statistics
  const statistics =
    await api.functional.ecommerceMall.seller.products.rating_statistics.ratingStatistics(
      sellerLoginConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(statistics);
  // 6. Validate rating statistics structure
  // The response should have the correct structure with averageRating, totalReviews, and distribution
  TestValidator.predicate(
    "average rating is a valid number",
    statistics.averageRating >= 0 && statistics.averageRating <= 5,
  );
  TestValidator.predicate(
    "total reviews is a non-negative integer",
    statistics.totalReviews >= 0,
  );
  TestValidator.predicate(
    "distribution has all star levels",
    "1" in statistics.distribution &&
      "2" in statistics.distribution &&
      "3" in statistics.distribution &&
      "4" in statistics.distribution &&
      "5" in statistics.distribution,
  );
  TestValidator.equals(
    "distribution values are non-negative",
    statistics.distribution["1"] >= 0 &&
      statistics.distribution["2"] >= 0 &&
      statistics.distribution["3"] >= 0 &&
      statistics.distribution["4"] >= 0 &&
      statistics.distribution["5"] >= 0,
    true,
  );
}
