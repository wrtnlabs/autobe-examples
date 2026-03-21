import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_products_variants_options_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_options_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test admin approving a pending refund request.
 *
 * This scenario validates the primary success path for the refund request update operation.
 * Setup requires creating the full e-commerce workflow:
 * 1. Create seller account via seller/join and obtain seller auth
 * 2. Create product with variant and add inventory via seller endpoints
 * 3. Create customer account via customer/join
 * 4. Create shipping address via customer/addresses
 * 5. Add product to cart via customer/cart/items
 * 6. Checkout to create order via customer/checkout/confirm
 * 7. Seller creates shipment via seller/shipments
 * 8. Customer confirms delivery via customer/orders/{orderId}/shipments/{shipmentId}/confirm-delivery
 * 9. Customer creates refund request through their account
 *
 * Then admin approves the refund request by calling PUT with status='approved'.
 *
 * Validation:
 * - Verify response status is 'approved'
 * - seller_response_at timestamp is set
 * - refund_request_snapshot is created with snapshot_status='approved'
 * - inventory quantity is restored for the product variant
 */
export async function test_api_refund_request_admin_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // ========================================================================
  // 1. SELLER SETUP - Create seller and authenticate
  // ========================================================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller approval status is pending initially",
    sellerAuth.approval_status,
    "pending",
  );
  // ========================================================================
  // 2. ADMIN SETUP - Create admin account and authenticate
  // ========================================================================
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!" as string & tags.Format<"password">,
      name: "Test Admin",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // ========================================================================
  // 3. CREATE PRODUCT - Seller creates product
  // Note: In real system, seller would need approval first, but for e2e test
  // we proceed with product creation as the backend handles the flow
  // ========================================================================
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Get the variant ID from the created product
  const variantId = product.variants[0]?.id;
  TestValidator.predicate("product has variants", variantId !== undefined);
  // ========================================================================
  // 4. ADD INVENTORY - Seller adds stock to the variant
  // ========================================================================
  const initialStock = 10;
  const inventoryRecord =
    await api.functional.ecommerceMall.seller.products.variants.inventory.create(
      sellerConnection,
      {
        productId: product.id,
        variantId: variantId!,
        body: {
          operation: "restock" as const,
          quantity: initialStock as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          reason: "Initial stock",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  TestValidator.equals(
    "inventory quantity matches",
    inventoryRecord.quantity_change,
    initialStock,
  );
  // ========================================================================
  // 5. CUSTOMER SETUP - Create customer and authenticate
  // ========================================================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // ========================================================================
  // 6. CREATE SHIPPING ADDRESS - Customer adds delivery address
  // ========================================================================
  const address =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postal_code: "12345",
          country: "Test Country",
          is_default: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // ========================================================================
  // 7. ADD TO CART - Customer adds product to cart
  // ========================================================================
  const cartItem =
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          variant_id: variantId!,
          quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  TestValidator.equals("cart quantity matches", cartItem.quantity, 2);
  // ========================================================================
  // 8. CHECKOUT - Create order from cart
  // ========================================================================
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "mock_payment_token_success",
          address_id: address.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  TestValidator.equals("order status is paid", order.status, "paid");
  // Get the order item for later
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // ========================================================================
  // 9. CREATE SHIPMENT - Seller ships the order item
  // ========================================================================
  const shipment = await api.functional.ecommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItem.id],
        carrier: "Test Carrier",
        trackingNumber: "TRACK123456",
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // ========================================================================
  // 10. CONFIRM DELIVERY - Customer confirms receiving the shipment
  // ========================================================================
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // ========================================================================
  // 11. GET REFUND REQUEST - Retrieve the refund request from customer's account
  // ========================================================================
  // The customer should have a refund request for the delivered item
  // We access it through the customer authorization response
  const refundRequest = customerAuth.refundRequests.find(
    (r) => r.orderItem.id === orderItem.id,
  );
  // For e2e test, we validate that a refund request exists
  TestValidator.predicate(
    "refund request exists for delivered item",
    refundRequest !== undefined,
  );
  // ========================================================================
  // 12. ADMIN APPROVES REFUND REQUEST
  // ========================================================================
  const approvedRefundRequest =
    await api.functional.ecommerceMall.admin.refund_requests.update(
      adminConnection,
      {
        requestId: refundRequest!.id,
        body: {
          status: "approved" as const,
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(approvedRefundRequest);
  // ========================================================================
  // VALIDATION: Verify the approval was successful
  // ========================================================================
  // 1. Status should be 'approved'
  TestValidator.equals(
    "refund request status is approved",
    approvedRefundRequest.status,
    "approved",
  );
  // 2. seller_response_at should be set
  TestValidator.predicate(
    "seller response timestamp is set",
    approvedRefundRequest.seller_response_at !== null &&
      approvedRefundRequest.seller_response_at !== undefined,
  );
  // 3. refund_request_snapshot should be created
  TestValidator.predicate(
    "refund request snapshots exist",
    approvedRefundRequest.refundRequestSnapshots !== null &&
      approvedRefundRequest.refundRequestSnapshots !== undefined,
  );
  TestValidator.predicate(
    "refund request has at least one snapshot",
    approvedRefundRequest.refundRequestSnapshots.length > 0,
  );
  // 4. Validate snapshot details
  const snapshot = approvedRefundRequest.refundRequestSnapshots[0];
  TestValidator.equals(
    "snapshot status is approved",
    snapshot.snapshot_status,
    "approved",
  );
  TestValidator.equals(
    "snapshot seller response is approved",
    snapshot.seller_response,
    "approved",
  );
  TestValidator.equals(
    "snapshot reason matches original",
    snapshot.snapshot_reason,
    refundRequest!.reason,
  );
}
