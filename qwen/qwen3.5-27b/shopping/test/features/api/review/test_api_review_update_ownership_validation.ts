import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that only the customer who originally wrote the review can update it.
 *
 * Validates review update ownership by attempting to update a review with a different customer's credentials. The test ensures that the system correctly enforces authorization boundaries and prevents unauthorized modifications to review content.
 *
 * This test verifies that:
 * - Reviews can only be updated by their original author
 * - Unauthorized update attempts are rejected with appropriate error responses
 * - The original review author retains the ability to update their own review
 * - Customer identity is verified via JWT token in connection headers
 *
 * 1. Register and authenticate two different customers (Customer A and Customer B)
 * 2. Register and authenticate a seller
 * 3. Seller creates a product with a variant and adds inventory
 * 4. Customer A creates an address, adds variant to cart, and completes checkout
 * 5. Seller creates a shipment for the order
 * 6. Customer A confirms delivery to make the order item eligible for review
 * 7. Customer A creates a review for the product
 * 8. Customer B attempts to update Customer A's review (should fail with authorization error)
 * 9. Customer A successfully updates their own review
 * 10. Validate ownership enforcement and update success
 */
export async function test_api_review_update_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Customer A (review author)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerA);
  // 2. Register and authenticate Customer B (unauthorized updater)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerB);
  // 3. Register and authenticate Seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 4. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Seller creates a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // 6. Customer A creates a shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerAConnection,
    {},
  );
  typia.assert(address);
  // 7. Customer A adds variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerAConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 8. Customer A completes checkout
  const order = await generate_random_shopping_mall_customer_checkout(
    customerAConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
        payment_token: "test_payment_token",
      },
    },
  );
  typia.assert(order);
  // 9. Seller creates shipment for the order
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          carrier_name: "Test Carrier",
          tracking_number: `TRACK-${RandomGenerator.alphaNumeric(10)}`,
          order_item_ids: order.items.map((item) => item.id),
        },
      },
    );
  typia.assert(shipment);
  // 10. Customer A confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
      customerAConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 11. Customer A creates a review
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerAConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_item_id: order.items[0].id,
        rating: 4,
        content: "Great product! Very satisfied with the purchase.",
      },
    },
  );
  typia.assert(review);
  // 12. Customer B attempts to update Customer A's review (should fail)
  await TestValidator.error(
    "Customer B cannot update Customer A's review - ownership validation",
    async () => {
      await api.functional.shoppingMall.customer.reviews.update(
        customerBConnection,
        {
          reviewId: review.id,
          body: {
            rating: 5,
            content: "This should fail - not the review author",
          } satisfies IShoppingMallReview.IUpdate,
        },
      );
    },
  );
  // 13. Customer A successfully updates their own review
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(
      customerAConnection,
      {
        reviewId: review.id,
        body: {
          rating: 5,
          content: "Updated review - excellent product!",
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 14. Validate the update was successful
  TestValidator.equals(
    "review rating updated by author",
    updatedReview.rating,
    5,
  );
  TestValidator.equals(
    "review content updated by author",
    updatedReview.content,
    "Updated review - excellent product!",
  );
  TestValidator.equals(
    "review author remains the same",
    updatedReview.customer.id,
    customerA.id,
  );
}
