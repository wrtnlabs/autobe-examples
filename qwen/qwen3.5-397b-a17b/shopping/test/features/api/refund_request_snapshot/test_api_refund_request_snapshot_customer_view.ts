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
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
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
 * Test that a customer can successfully retrieve a refund request snapshot for their own refund request.
 *
 * Test Flow:
 * 1. Register and login customer account
 * 2. Register and login seller account (assumes auto-approval for testing)
 * 3. Seller creates a product with a variant
 * 4. Customer adds the variant to cart and places an order
 * 5. Seller creates a shipment for the order item
 * 6. Customer confirms delivery of the shipment
 * 7. Customer submits a refund request for the delivered item
 * 8. Seller responds to the refund request (approve), which creates a snapshot
 * 9. Customer retrieves the refund request snapshot and validates all fields
 */
export async function test_api_refund_request_snapshot_customer_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login customer
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
  // 2. Register and login seller (assumes auto-approval for testing)
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
  // 3. Seller creates a product
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
  // 4. Seller creates a product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
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
              value: RandomGenerator.pick(["S", "M", "L", "XL"]),
            },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart
  const cartItem =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 6. Customer places order (addressId must be valid customer address)
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item from the order
  TestValidator.predicate("order has items", order.items.length > 0);
  const orderItem = order.items[0];
  // 7. Seller creates shipment for the order item
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_item_ids: [orderItem.id],
        tracking_carrier: "TestCarrier",
        tracking_number: `TRACK-${RandomGenerator.alphaNumeric(12)}`,
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
  // 9. Customer submits refund request
  const refundRequest =
    await api.functional.shoppingMall.customer.refund_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: "Product quality issue - not as described",
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request status PENDING",
    refundRequest.status,
    "PENDING",
  );
  // 10. Seller responds to refund request (approve) - this creates the snapshot
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
  TestValidator.equals(
    "refund request approved",
    updatedRefundRequest.status,
    "APPROVED",
  );
  TestValidator.predicate(
    "seller responded",
    updatedRefundRequest.responded_by_seller_id !== null,
  );
  TestValidator.predicate(
    "responded_at set",
    updatedRefundRequest.responded_at !== null,
  );
  // 11. Customer retrieves the refund request snapshot
  // Note: snapshotId would typically come from a list snapshots endpoint
  // For this test, we use a placeholder that would be replaced with actual snapshot ID
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.customer.refund_request_snapshots.at(
      customerConnection,
      {
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 12. Validate snapshot business logic (typia.assert already validates types)
  TestValidator.equals(
    "snapshot reason matches",
    snapshot.reason,
    "Product quality issue - not as described",
  );
  TestValidator.equals(
    "snapshot status is APPROVED",
    snapshot.status,
    "APPROVED",
  );
  TestValidator.predicate(
    "snapshot has order item",
    snapshot.orderItem !== undefined,
  );
  TestValidator.predicate(
    "snapshot has customer",
    snapshot.customer !== undefined,
  );
  TestValidator.predicate(
    "snapshot has responded seller",
    snapshot.respondedBySeller !== undefined &&
      snapshot.respondedBySeller !== null,
  );
  TestValidator.predicate(
    "snapshot delivered_at exists",
    snapshot.delivered_at !== null,
  );
  TestValidator.predicate(
    "snapshot requested_at exists",
    snapshot.requested_at !== null,
  );
  TestValidator.predicate(
    "snapshot responded_at exists",
    snapshot.responded_at !== null,
  );
  TestValidator.predicate(
    "snapshot snapshot_at exists",
    snapshot.snapshot_at !== null,
  );
  TestValidator.predicate(
    "snapshot created_at exists",
    snapshot.created_at !== null,
  );
  // Validate snapshot timestamps are in correct order
  TestValidator.predicate(
    "requested_at before responded_at",
    new Date(snapshot.requested_at).getTime() <=
      new Date(snapshot.responded_at!).getTime(),
  );
  TestValidator.predicate(
    "responded_at before or equal snapshot_at",
    new Date(snapshot.responded_at!).getTime() <=
      new Date(snapshot.snapshot_at).getTime(),
  );
}
