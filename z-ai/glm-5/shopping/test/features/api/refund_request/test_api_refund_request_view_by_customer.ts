import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_checkout_complete } from "../../../generate/generate_random_shopping_mall_customer_checkout_complete";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test successful retrieval of a refund request by the customer who created it.
 *
 * Workflow:
 * 1. Administrator creates category
 * 2. Seller creates product and adds inventory
 * 3. Customer joins and adds item to cart
 * 4. Customer completes checkout
 * 5. Seller creates shipment
 * 6. Customer confirms delivery
 * 7. Customer creates refund request
 * 8. Customer retrieves and validates the refund request
 */
export async function test_api_refund_request_view_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - create seller account, product, and inventory
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(product);
  // Add inventory to product's first variant
  const variant = product.variants[0];
  await generate_random_shopping_mall_seller_variants_inventory_adjust(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity_change: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
        >(),
        reason: "Initial stock for testing",
      },
    },
  );
  // 3. Customer setup - join and add item to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 4. Complete checkout
  const order = await generate_random_shopping_mall_customer_checkout_complete(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get order items for shipment
  const orderItem = order.orderItems.find(
    (item) => item.product.id === product.id,
  );
  typia.assertGuard(orderItem!);
  // 5. Seller creates shipment
  const shipment =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: RandomGenerator.name(1),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderId: order.id,
          orderItemIds: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  // 6. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(confirmedShipment);
  // 7. Customer creates refund request
  const refundReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 10,
    wordMax: 20,
  });
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  // 8. Customer retrieves the refund request
  const retrievedRefundRequest =
    await api.functional.shoppingMall.customer.refund_requests.at(
      customerConnection,
      { refundRequestId: refundRequest.id },
    );
  typia.assert(retrievedRefundRequest);
  // 9. Validate refund request details
  TestValidator.equals(
    "refund request ID",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "reason text",
    retrievedRefundRequest.reason,
    refundReason,
  );
  TestValidator.equals(
    "status is pending",
    retrievedRefundRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    new Date(retrievedRefundRequest.created_at).getTime() > 0,
  );
  TestValidator.equals(
    "responded_at is null",
    retrievedRefundRequest.responded_at,
    null,
  );
  // 10. Validate order item information
  const retrievedOrderItem = retrievedRefundRequest.orderItem;
  TestValidator.equals("order item ID", retrievedOrderItem.id, orderItem.id);
  TestValidator.equals(
    "order item status is delivered",
    retrievedOrderItem.status,
    "delivered",
  );
  TestValidator.equals(
    "quantity matches",
    retrievedOrderItem.quantity,
    cartItem.quantity,
  );
  // Validate nested objects exist
  TestValidator.predicate(
    "product exists",
    retrievedOrderItem.product !== null &&
      retrievedOrderItem.product !== undefined,
  );
  TestValidator.predicate(
    "variant exists",
    retrievedOrderItem.variant !== null &&
      retrievedOrderItem.variant !== undefined,
  );
  TestValidator.predicate(
    "seller exists",
    retrievedOrderItem.seller !== null &&
      retrievedOrderItem.seller !== undefined,
  );
  TestValidator.predicate(
    "order exists",
    retrievedOrderItem.order !== null && retrievedOrderItem.order !== undefined,
  );
}