import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_customer_orders_items_refund_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_refund_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that an administrator can retrieve a refund request snapshot to view the complete audit trail of a refund request status transition.
 *
 * Validates the complete refund request snapshot viewing workflow including multi-actor setup (administrator, customer, seller), product creation, order placement, delivery confirmation, refund request creation, and seller approval. Ensures that the snapshot correctly captures the status transition from pending to approved, the seller's response reason, and all related entity references.
 *
 * Special attention is given to verifying that the snapshot preserves the exact state at the moment of seller's response, including the status before and after the transition, and that the snapshot is accessible to administrators for audit purposes.
 *
 * 1. Administrator registers and authenticates to the platform.
 * 2. Customer registers and authenticates to place orders.
 * 3. Seller registers, administrator approves the seller account, then seller authenticates.
 * 4. Seller creates a product with a variant and adds initial inventory.
 * 5. Customer adds the product variant to cart and creates a shipping address.
 * 6. Customer completes checkout to create an order with the product.
 * 7. Seller creates a shipment for the order item, changing status to 'shipped'.
 * 8. Customer confirms delivery, changing order item status to 'delivered'.
 * 9. Customer creates a refund request for the delivered order item.
 * 10. Seller approves the refund request with a response reason, creating a snapshot.
 * 11. Administrator retrieves the refund request snapshot by its ID.
 * 12. Validates that the snapshot contains correct status transition data and seller response.
 */
export async function test_api_refund_request_snapshot_view_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
    },
  });
  // 3. Seller registration and approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
    },
  });
  typia.assert(sellerAuth);
  // Administrator approves the seller
  await api.functional.shoppingMall.administrator.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
      body: {} satisfies IShoppingMallSeller.IApprove,
    },
  );
  // Re-authenticate seller after approval
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      href: "https://test.com/login",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 4. Seller creates product with variant
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 10,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart
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
  // 6. Customer creates shipping address
  const address = await api.functional.shoppingMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: "Test Country",
      } satisfies IShoppingMallCustomerAddress.ICreate,
    },
  );
  typia.assert(address);
  // 7. Customer completes checkout
  const order = await api.functional.shoppingMall.customer.checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
        payment_token: "test_payment_token",
      } satisfies IShoppingMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  // 8. Seller creates shipment
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerLoginConnection,
    {
      body: {
        carrier_name: "Test Carrier",
        tracking_number: `TRACK-${RandomGenerator.alphaNumeric(10)}`,
        order_item_ids: [order.items[0].id],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 9. Customer confirms delivery
  await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );
  // 10. Customer creates refund request
  const refundRequest =
    await api.functional.shoppingMall.customer.orders.items.refund.create(
      customerConnection,
      {
        orderId: order.id,
        itemId: order.items[0].id,
        body: {
          reason: "Product was damaged during shipping",
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 11. Seller approves refund request
  const approvedRefund =
    await api.functional.shoppingMall.seller.orders.items.refund.approve(
      sellerLoginConnection,
      {
        orderId: order.id,
        itemId: order.items[0].id,
        body: {
          responseText: "We apologize for the damage. Refund approved.",
        } satisfies IShoppingMallRefundRequest.IApprove,
      },
    );
  typia.assert(approvedRefund);
  // 12. Administrator retrieves the refund request snapshot
  // Using the refund request ID as the snapshot ID (assuming they are the same in this system)
  const snapshot =
    await api.functional.shoppingMall.administrator.refund_requests.snapshots.at(
      adminConnection,
      {
        snapshotId: refundRequest.id,
      },
    );
  typia.assert(snapshot);
  // 13. Validate snapshot data
  TestValidator.equals(
    "status before is pending",
    snapshot.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "status after is approved",
    snapshot.statusAfter,
    "approved",
  );
  TestValidator.predicate(
    "response text exists",
    snapshot.responseText !== null && snapshot.responseText.length > 0,
  );
  TestValidator.equals(
    "refund request status is approved",
    snapshot.refundRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "seller is set in snapshot",
    snapshot.seller !== null,
  );
  TestValidator.predicate(
    "refund request has customer",
    snapshot.refundRequest.customer !== null,
  );
  TestValidator.predicate(
    "refund request has order item",
    snapshot.refundRequest.orderItem !== null,
  );
  TestValidator.predicate(
    "created at timestamp exists",
    snapshot.createdAt.length > 0,
  );
}
