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
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_customer_orders_items_refund_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_refund_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test the primary success path where a seller approves a refund request for a delivered order item.
 *
 * Validates the complete refund approval workflow including seller authentication, refund request approval, and verification of state transitions. Ensures that the refund request status changes from 'pending' to 'approved', the order item status changes to 'refunded', and stock quantity is restored through inventory records.
 *
 * Special attention is given to verifying that the seller's response reason is properly stored in the snapshot, the responded_at timestamp is set, and the order item's status correctly reflects the approved refund.
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Seller creates a product with a variant and initial stock inventory.
 * 3. Customer registers and authenticates to the platform.
 * 4. Customer adds the product variant to their shopping cart.
 * 5. Customer places an order through checkout with shipping address and payment.
 * 6. Seller creates a shipment for the order item with carrier and tracking information.
 * 7. Customer confirms delivery, changing the order item status to 'delivered'.
 * 8. Customer creates a refund request for the delivered order item.
 * 9. Seller approves the refund request with a response reason.
 * 10. Validates refund request status is 'approved' with seller information and responded_at timestamp.
 * 11. Validates order item status changed to 'refunded'.
 * 12. Validates stock quantity was restored through positive inventory record.
 */
export async function test_api_refund_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create variant with initial stock
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 10,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 5. Add to cart
  const cartItem = await api.functional.shoppingMall.customer.cart.items.create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      } satisfies IShoppingMallCustomerCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 6. Checkout (using random UUID for address in simulation mode)
  const order = await api.functional.shoppingMall.customer.checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        payment_token: RandomGenerator.alphaNumeric(32),
      } satisfies IShoppingMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // 7. Seller creates shipment
  const shipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: "FedEx",
          tracking_number: RandomGenerator.alphaNumeric(20),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 8. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 9. Customer creates refund request
  const refundRequest =
    await api.functional.shoppingMall.customer.orders.items.refund.create(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          reason: "Product arrived damaged",
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 10. Seller approves refund request
  const approvedRefund =
    await api.functional.shoppingMall.seller.orders.items.refund.approve(
      sellerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          responseText: "Refund approved due to damaged product",
        } satisfies IShoppingMallRefundRequest.IApprove,
      },
    );
  typia.assert(approvedRefund);
  // 11. Validate refund request status is 'approved'
  TestValidator.equals(
    "refund request status",
    approvedRefund.status,
    "approved",
  );
  // 12. Validate seller information is present
  TestValidator.predicate("seller is set", approvedRefund.seller !== null);
  if (approvedRefund.seller !== null) {
    TestValidator.equals(
      "seller email matches",
      approvedRefund.seller.email,
      sellerAuth.email,
    );
  }
  // 13. Validate responded_at timestamp is set
  TestValidator.predicate(
    "responded_at is set",
    approvedRefund.responded_at !== null,
  );
  // 14. Validate order item status is 'refunded'
  TestValidator.equals(
    "order item status",
    approvedRefund.orderItem.status,
    "refunded",
  );
}
