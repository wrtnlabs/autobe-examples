import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_customers_me_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_reviews_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_review_update_partial_changes(
  connection: api.IConnection,
): Promise<void> {
  // ========== SETUP: Admin ==========
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ========== SETUP: Seller ==========
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Admin approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // ========== SETUP: Product & Variant ==========
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "M" },
          ],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // ========== SETUP: Customer ==========
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Add to cart
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variantId: variant.id,
        quantity: 1,
      },
    },
  );
  // Create order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        address_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // Get order item ID for shipment
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // ========== SHIPMENT & DELIVERY ==========
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItem.id],
          carrierName: "FedEx",
          trackingNumber: RandomGenerator.alphaNumeric(12).toUpperCase(),
        },
      },
    );
  typia.assert(shipment);
  // Customer confirms delivery
  await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    { shipmentId: shipment.id },
  );
  // ========== SCENARIO 1: Rating-only update with existing content ==========
  const review1 =
    await generate_random_shopping_mall_customer_customers_me_reviews_create(
      customerConnection,
      {
        body: {
          product_id: product.id,
          order_id: order.id,
          rating: 3,
          content: "Average quality product",
        },
      },
    );
  typia.assert(review1);
  // Update: Change rating from 3 to 4, keep content
  const updatedReview1 =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review1.id,
        body: {
          rating: 4,
          content: "Average quality product",
        },
      },
    );
  typia.assert(updatedReview1);
  TestValidator.equals("rating updated from 3 to 4", updatedReview1.rating, 4);
  TestValidator.equals(
    "content preserved",
    updatedReview1.content,
    "Average quality product",
  );
  // ========== SETUP SECOND REVIEW FOR SCENARIO 2 ==========
  // Create another order for second review test
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {});
  await generate_random_shopping_mall_customer_cart_items_create(
    customer2Connection,
    { body: { variantId: variant.id, quantity: 1 } },
  );
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customer2Connection,
    { body: { address_id: typia.random<string & tags.Format<"uuid">>() } },
  );
  typia.assert(order2);
  const orderItem2 = order2.orderItems[0];
  typia.assert(orderItem2);
  const shipment2 =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItem2.id],
          carrierName: "UPS",
          trackingNumber: RandomGenerator.alphaNumeric(12).toUpperCase(),
        },
      },
    );
  typia.assert(shipment2);
  await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
    customer2Connection,
    { shipmentId: shipment2.id },
  );
  // ========== SCENARIO 2: Rating-only update without content ==========
  const review2 =
    await generate_random_shopping_mall_customer_customers_me_reviews_create(
      customer2Connection,
      {
        body: {
          product_id: product.id,
          order_id: order2.id,
          rating: 5,
          content: null,
        },
      },
    );
  typia.assert(review2);
  // Update: Change rating from 5 to 4, content stays null
  const updatedReview2 =
    await api.functional.shoppingMall.customer.reviews.update(
      customer2Connection,
      {
        reviewId: review2.id,
        body: {
          rating: 4,
          content: null,
        },
      },
    );
  typia.assert(updatedReview2);
  TestValidator.equals("rating updated from 5 to 4", updatedReview2.rating, 4);
  TestValidator.equals("content remains null", updatedReview2.content, null);
  // ========== SETUP THIRD REVIEW FOR SCENARIO 3 ==========
  const customer3Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer3Connection, {});
  await generate_random_shopping_mall_customer_cart_items_create(
    customer3Connection,
    { body: { variantId: variant.id, quantity: 1 } },
  );
  const order3 = await generate_random_shopping_mall_customer_orders_create(
    customer3Connection,
    { body: { address_id: typia.random<string & tags.Format<"uuid">>() } },
  );
  typia.assert(order3);
  const orderItem3 = order3.orderItems[0];
  typia.assert(orderItem3);
  const shipment3 =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItem3.id],
          carrierName: "DHL",
          trackingNumber: RandomGenerator.alphaNumeric(12).toUpperCase(),
        },
      },
    );
  typia.assert(shipment3);
  await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
    customer3Connection,
    { shipmentId: shipment3.id },
  );
  // ========== SCENARIO 3: Remove content while changing rating ==========
  const review3 =
    await generate_random_shopping_mall_customer_customers_me_reviews_create(
      customer3Connection,
      {
        body: {
          product_id: product.id,
          order_id: order3.id,
          rating: 4,
          content: "Some review text",
        },
      },
    );
  typia.assert(review3);
  // Update: Change rating from 4 to 5, remove content (set to null)
  const updatedReview3 =
    await api.functional.shoppingMall.customer.reviews.update(
      customer3Connection,
      {
        reviewId: review3.id,
        body: {
          rating: 5,
          content: null,
        },
      },
    );
  typia.assert(updatedReview3);
  TestValidator.equals("rating updated from 4 to 5", updatedReview3.rating, 5);
  TestValidator.equals(
    "content removed (now null)",
    updatedReview3.content,
    null,
  );
  // ========== VALIDATION: Verify update timestamps changed ==========
  TestValidator.predicate(
    "updated_at changed after review update",
    updatedReview1.updated_at !== review1.updated_at,
  );
}
