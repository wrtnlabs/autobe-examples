import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_order_item_shipped_item_with_refund_request(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieval of a delivered order item with an active refund request,
   * validating complete relationship data including shipment and refund information.
   */
  // 1. Seller setup - create seller, product, and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
    },
  });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          optionValues: { color: "Red", size: "Large" },
          price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        },
      },
    );
  // 2. Customer setup - register, add to cart, checkout
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  customerConnection.headers = { Authorization: customerAuth.token.access };
  const quantity = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variant.id,
        quantity,
      },
    },
  );
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  // 3. Get order item ID from the order
  // Note: IShoppingMallOrder may include items at runtime even if not in type definition
  // We cast to access the items array that should be returned by the checkout endpoint
  const orderWithItems = order as IShoppingMallOrder & {
    items: IShoppingMallOrderItem.ISummary[];
  };
  TestValidator.predicate(
    "order has items",
    orderWithItems.items !== undefined &&
      orderWithItems.items !== null &&
      orderWithItems.items.length > 0,
  );
  const paidOrderItemSummary = orderWithItems.items[0];
  // 4. Retrieve the order item to get full details
  let orderItem = await api.functional.shoppingMall.customer.orderItems.at(
    customerConnection,
    {
      orderItemId: paidOrderItemSummary.id,
    },
  );
  typia.assert(orderItem);
  // Verify initial status is 'paid'
  TestValidator.equals("initial order item status", orderItem.status, "paid");
  // 5. Seller creates shipment (order item status → 'shipped')
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order.id,
        order_item_ids: [orderItem.id],
        carrier_name: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(12).toUpperCase(),
      },
    },
  );
  typia.assert(shipment);
  // 6. Customer confirms delivery (order item status → 'delivered')
  const deliveredShipment =
    await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveredShipment);
  // 7. Customer creates refund request
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason:
            "Product does not match description. The color is different from what was shown in the product images.",
        },
      },
    );
  typia.assert(refundRequest);
  // 8. Retrieve the order item again and validate complete relationships
  orderItem = await api.functional.shoppingMall.customer.orderItems.at(
    customerConnection,
    {
      orderItemId: paidOrderItemSummary.id,
    },
  );
  typia.assert(orderItem);
  // 9. Validate order item status is now 'delivered'
  TestValidator.equals(
    "order item status after delivery",
    orderItem.status,
    "delivered",
  );
  // 10. Validate shipment relationship is populated
  TestValidator.predicate(
    "shipment relationship exists",
    orderItem.shipment !== null && orderItem.shipment !== undefined,
  );
  if (orderItem.shipment) {
    TestValidator.equals(
      "shipment carrier name",
      orderItem.shipment.carrier_name,
      "FedEx",
    );
    TestValidator.predicate(
      "shipment has tracking number",
      orderItem.shipment.tracking_number.length > 0,
    );
    TestValidator.predicate(
      "shipment has shipped_at timestamp",
      orderItem.shipment.shipped_at.length > 0,
    );
    TestValidator.predicate(
      "shipment has delivered_at timestamp",
      orderItem.shipment.delivered_at !== null,
    );
  }
  // 11. Validate refund request relationship is populated
  TestValidator.predicate(
    "refund request relationship exists",
    orderItem.refundRequest !== undefined,
  );
  if (orderItem.refundRequest) {
    TestValidator.equals(
      "refund request status",
      orderItem.refundRequest.status,
      "pending",
    );
    TestValidator.predicate(
      "refund request has id",
      orderItem.refundRequest.id.length > 0,
    );
    TestValidator.predicate(
      "refund request has reason",
      orderItem.refundRequest.reason.length > 0,
    );
    TestValidator.predicate(
      "refund request has created_at",
      orderItem.refundRequest.created_at.length > 0,
    );
  }
  // 12. Validate order context
  TestValidator.predicate(
    "order has order number",
    orderItem.order.order_number.length > 0,
  );
  TestValidator.predicate(
    "order has status",
    orderItem.order.status.length > 0,
  );
  // 13. Validate seller shop information
  TestValidator.predicate(
    "seller has shop name",
    orderItem.seller.shop_name.length > 0,
  );
  TestValidator.equals("seller id matches", orderItem.seller.id, sellerAuth.id);
  // 14. Validate snapshot exists and contains purchase-time state
  TestValidator.predicate(
    "snapshot exists",
    orderItem.snapshot !== null && orderItem.snapshot !== undefined,
  );
  TestValidator.predicate(
    "snapshot has product name",
    orderItem.snapshot.product_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has product description",
    orderItem.snapshot.product_description.length > 0,
  );
  TestValidator.predicate("snapshot has price", orderItem.snapshot.price > 0);
  TestValidator.predicate(
    "snapshot has seller shop name",
    orderItem.snapshot.seller_shop_name.length > 0,
  );
}
