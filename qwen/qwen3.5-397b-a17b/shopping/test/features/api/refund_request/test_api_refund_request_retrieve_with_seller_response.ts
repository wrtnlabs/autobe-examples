import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a customer can retrieve their refund request after the seller has responded.
 *
 * This test verifies the complete refund request workflow:
 * 1. Customer and seller authentication
 * 2. Product creation with variants
 * 3. Order placement and shipment
 * 4. Delivery confirmation
 * 5. Refund request submission
 * 6. Seller response (approval)
 * 7. Customer retrieval of refund request with seller response details
 */
export async function test_api_refund_request_retrieve_with_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            {
              key: "color",
              value: RandomGenerator.pick(["Red", "Blue", "Green"]),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L"]),
            },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer adds product to cart
  const cartItem =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 6. Customer creates order
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the first order item for refund request
  const orderItem = order.items[0];
  TestValidator.predicate("order item exists", orderItem !== undefined);
  // 7. Seller creates shipment
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_item_ids: [orderItem.id],
        tracking_carrier: RandomGenerator.pick(["FedEx", "UPS", "DHL"]),
        tracking_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 8. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 9. Customer creates refund request
  const refundRequest =
    await api.functional.shoppingMall.customer.refund_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Verify initial refund request status is PENDING
  TestValidator.equals(
    "initial status is PENDING",
    refundRequest.status,
    "PENDING",
  );
  TestValidator.predicate(
    "responded_at is null initially",
    refundRequest.responded_at === null,
  );
  TestValidator.predicate(
    "responded_by_seller_id is null initially",
    refundRequest.responded_by_seller_id === null,
  );
  TestValidator.predicate(
    "respondedBySeller is null initially",
    refundRequest.respondedBySeller === null,
  );
  // 10. Seller responds to refund request (approve)
  const updatedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "APPROVED",
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(updatedRefundRequest);
  // Verify seller response was recorded
  TestValidator.equals(
    "status changed to APPROVED",
    updatedRefundRequest.status,
    "APPROVED",
  );
  TestValidator.predicate(
    "responded_at is populated",
    updatedRefundRequest.responded_at !== null,
  );
  TestValidator.predicate(
    "responded_by_seller_id is populated",
    updatedRefundRequest.responded_by_seller_id !== null,
  );
  TestValidator.predicate(
    "respondedBySeller is populated",
    updatedRefundRequest.respondedBySeller !== null,
  );
  TestValidator.equals(
    "responded_by_seller_id matches seller",
    updatedRefundRequest.responded_by_seller_id,
    sellerAuth.id,
  );
  // 11. Customer retrieves refund request with seller response
  const retrievedRefundRequest =
    await api.functional.shoppingMall.customer.refund_requests.at(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 12. Validate retrieved refund request contains seller response
  TestValidator.equals(
    "retrieved status is APPROVED",
    retrievedRefundRequest.status,
    "APPROVED",
  );
  TestValidator.predicate(
    "retrieved responded_at is populated",
    retrievedRefundRequest.responded_at !== null,
  );
  TestValidator.predicate(
    "retrieved responded_by_seller_id is populated",
    retrievedRefundRequest.responded_by_seller_id !== null,
  );
  TestValidator.predicate(
    "retrieved respondedBySeller is populated",
    retrievedRefundRequest.respondedBySeller !== null,
  );
  TestValidator.equals(
    "retrieved responded_by_seller_id matches seller",
    retrievedRefundRequest.responded_by_seller_id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "retrieved seller shop name matches",
    retrievedRefundRequest.respondedBySeller!.shop_name,
    sellerAuth.shop_name,
  );
  // 13. Validate timestamp ordering
  const deliveredAt = new Date(retrievedRefundRequest.delivered_at).getTime();
  const requestedAt = new Date(retrievedRefundRequest.requested_at).getTime();
  const respondedAt = new Date(retrievedRefundRequest.responded_at!).getTime();
  TestValidator.predicate(
    "delivered_at <= requested_at",
    deliveredAt <= requestedAt,
  );
  TestValidator.predicate(
    "requested_at <= responded_at",
    requestedAt <= respondedAt,
  );
  // 14. Validate order item details are preserved
  TestValidator.equals(
    "order item ID matches",
    retrievedRefundRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.predicate(
    "order item has product snapshot",
    retrievedRefundRequest.orderItem.productSnapshot !== undefined,
  );
  TestValidator.predicate(
    "order item has variant snapshot",
    retrievedRefundRequest.orderItem.productVariantSnapshot !== undefined,
  );
  TestValidator.predicate(
    "order item has seller info",
    retrievedRefundRequest.orderItem.seller !== undefined,
  );
  TestValidator.equals(
    "order item seller matches product seller",
    retrievedRefundRequest.orderItem.seller.id,
    sellerAuth.id,
  );
}
