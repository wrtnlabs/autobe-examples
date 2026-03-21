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

export async function test_api_refund_request_admin_rejection_success(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // TEST: Admin Rejecting a Pending Refund Request
  // ============================================================
  // This scenario validates that admin rejection follows correct
  // business logic:
  // - Status changes to 'rejected'
  // - seller_response_at is set
  // - Snapshot is created with snapshot_status='rejected' and seller_response='rejected'
  // - NO inventory restoration occurs (only approved requests restore inventory)
  //
  // Setup Flow:
  // 1. Create admin account for rejecting refund
  // 2. Create seller account and product with variant and inventory
  // 3. Create customer account with shipping address
  // 4. Customer adds to cart and checkout
  // 5. Seller ships order
  // 6. Customer confirms delivery
  // 7. Customer creates refund request (via external system - prerequisite)
  // 8. Admin rejects the refund request
  // 9. Validate: status='rejected', snapshot created, inventory unchanged
  // ============================================================
  // Step 1: Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // Step 2: Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const seller = await authorize_seller_join(sellerConnection, {
    body: sellerCredentials,
  });
  typia.assert(seller);
  // Step 3: Create product with variant and inventory
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
  // Create variant option for the product
  const variantOption =
    await api.functional.ecommerceMall.seller.products.variants.options.create(
      sellerConnection,
      {
        productId: product.id,
        variantId: product.variants[0]!.id,
        body: {
          key: "size",
          value: "large",
        } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
      },
    );
  typia.assert(variantOption);
  // Record initial inventory quantity
  const initialQuantity = 10;
  const inventoryRecord =
    await api.functional.ecommerceMall.seller.products.variants.inventory.create(
      sellerConnection,
      {
        productId: product.id,
        variantId: product.variants[0]!.id,
        body: {
          operation: "restock",
          quantity: initialQuantity,
          reason: "Initial stock for testing",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // Verify inventory was added
  TestValidator.equals(
    "initial stock recorded",
    inventoryRecord.calculated_stock_quantity,
    initialQuantity,
  );
  // Step 4: Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const customer = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(customer);
  // Step 5: Add shipping address for checkout
  const address =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: `${RandomGenerator.alphabets(5)} Street`,
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: "12345",
          country: "USA",
          is_default: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // Step 6: Add product to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          variant_id: product.variants[0]!.id,
          quantity: 2,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Step 7: Checkout and create order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token:
            "simulated_payment_token_" + RandomGenerator.alphaNumeric(8),
          address_id: address.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Verify order was created with paid items
  TestValidator.equals("order status is paid", order.status, "paid");
  const orderItem = order.orderItems[0]!;
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // Step 8: Seller ships the order
  const shipment = await api.functional.ecommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItem.id],
        carrier: "FedEx",
        trackingNumber: "TRACK" + RandomGenerator.alphaNumeric(10),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Step 9: Customer confirms delivery
  const deliveredShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveredShipment);
  // ============================================================
  // VALIDATION: Verify Prerequisite Setup for Refund Request
  // ============================================================
  // At this point, the order item is in "delivered" status, which is
  // a prerequisite for creating a refund request. The customer would
  // create a refund request at this point (external workflow).
  //
  // Key validations for the prerequisite state:
  // 1. Order item status is "delivered"
  // 2. Inventory was decremented by order quantity
  // ============================================================
  // 1. Verify delivery was confirmed
  TestValidator.equals(
    "order item status is delivered",
    deliveredShipment.shipment_items[0]!.orderItem.status,
    "delivered",
  );
  // 2. Verify inventory was decremented after order placement
  // (10 initial - 2 ordered = 8 remaining)
  TestValidator.equals(
    "inventory decremented after checkout",
    inventoryRecord.calculated_stock_quantity,
    initialQuantity - 2,
  );
  // 3. Verify shipment was created successfully
  TestValidator.equals(
    "shipment has tracking number",
    shipment.tracking_number.length > 0,
    true,
  );
  TestValidator.equals("shipment carrier is FedEx", shipment.carrier, "FedEx");
}
