import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
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
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test that a seller can successfully retrieve detailed information about a shipment they created.
 *
 * Precondition: A shipment must exist with at least one order item. The seller retrieves their own shipment using the shipment ID.
 *
 * Expected validations:
 * 1. Response contains shipment.id matching the requested shipmentId
 * 2. Response contains carrier name (e.g., DHL, FedEx, UPS) and tracking number
 * 3. Response contains created_at and updated_at timestamps
 * 4. Response includes nested order object with order id, order_number, status, and customer summary
 * 5. Response includes nested seller object with seller id, email, approval_status, and profile
 * 6. Response includes shipment_items array with at least one item
 * 7. Each shipment item contains orderItem with productSnapshot (name, description, base_price, category_name), sellerProfileSnapshot (shop_name, logo_url), productVariant (sku_code, optionValues, price, quantity), quantity, unitPrice, and status
 * 8. The shipment is not soft-deleted (deleted_at is null)
 */
export async function test_api_shipment_retrieval_with_complete_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. Create product with variants
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  TestValidator.predicate(
    "product has at least one variant",
    variant !== undefined,
  );
  // 4. Add inventory to the variant
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          operation: "restock" as const,
          quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          reason: "Initial stock",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Create shipping address for customer
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 6. Add product to customer cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Prepare checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(checkoutPrepare);
  // 8. Confirm checkout (creates order with paid order items)
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token:
            "test_payment_token_" + RandomGenerator.alphaNumeric(16),
          address_id: address.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Get the paid order item
  const paidOrderItem = order.orderItems.find((item) => item.status === "paid");
  TestValidator.predicate("order has paid items", paidOrderItem !== undefined);
  // 9. Create shipment with the paid order item
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [paidOrderItem!.id],
        carrier: RandomGenerator.pick(["DHL", "FedEx", "UPS", "USPS"]),
        trackingNumber: RandomGenerator.alphaNumeric(12).toUpperCase(),
      },
    },
  );
  typia.assert(shipment);
  // 10. Retrieve the shipment by ID (the actual test)
  const retrievedShipment =
    await api.functional.ecommerceMall.seller.shipments.at(sellerConnection, {
      shipmentId: shipment.id,
    });
  typia.assert(retrievedShipment);
  // === Validations ===
  // 1. Response contains shipment.id matching the requested shipmentId
  TestValidator.equals(
    "shipment ID matches",
    retrievedShipment.id,
    shipment.id,
  );
  // 2. Response contains carrier name and tracking number
  TestValidator.predicate(
    "has carrier name",
    retrievedShipment.carrier.length > 0,
  );
  TestValidator.predicate(
    "has tracking number",
    retrievedShipment.tracking_number.length > 0,
  );
  // 3. Response contains created_at and updated_at timestamps
  TestValidator.predicate(
    "has valid created_at",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedShipment.created_at),
  );
  TestValidator.predicate(
    "has valid updated_at",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedShipment.updated_at),
  );
  // 4. Response includes nested order object
  TestValidator.predicate(
    "has nested order",
    retrievedShipment.order !== undefined,
  );
  TestValidator.equals(
    "order ID matches",
    retrievedShipment.order.id,
    order.id,
  );
  TestValidator.equals(
    "order number matches",
    retrievedShipment.order.order_number,
    order.orderNumber,
  );
  TestValidator.predicate(
    "has customer summary in order",
    retrievedShipment.order.customer !== undefined,
  );
  // 5. Response includes nested seller object
  TestValidator.predicate(
    "has nested seller",
    retrievedShipment.seller !== undefined,
  );
  TestValidator.equals(
    "seller ID matches",
    retrievedShipment.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedShipment.seller.email,
    sellerAuth.email,
  );
  TestValidator.predicate(
    "has seller profile",
    retrievedShipment.seller.profile !== undefined,
  );
  // 6. Response includes shipment_items array with at least one item
  TestValidator.predicate(
    "has shipment items",
    retrievedShipment.shipment_items.length >= 1,
  );
  // 7. Validate shipment item details
  const firstShipmentItem = retrievedShipment.shipment_items[0];
  // productSnapshot validations
  TestValidator.predicate(
    "has productSnapshot",
    firstShipmentItem.orderItem.productSnapshot !== undefined,
  );
  TestValidator.predicate(
    "productSnapshot has name",
    firstShipmentItem.orderItem.productSnapshot.name.length > 0,
  );
  TestValidator.predicate(
    "productSnapshot has category_name",
    firstShipmentItem.orderItem.productSnapshot.category_name !== undefined,
  );
  // sellerProfileSnapshot validations
  TestValidator.predicate(
    "has sellerProfileSnapshot",
    firstShipmentItem.orderItem.sellerProfileSnapshot !== undefined,
  );
  TestValidator.predicate(
    "sellerProfileSnapshot has shop_name",
    firstShipmentItem.orderItem.sellerProfileSnapshot.shop_name.length > 0,
  );
  // productVariant validations
  TestValidator.predicate(
    "has productVariant",
    firstShipmentItem.orderItem.productVariant !== undefined,
  );
  TestValidator.predicate(
    "productVariant has sku_code",
    firstShipmentItem.orderItem.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "productVariant has optionValues",
    Array.isArray(firstShipmentItem.orderItem.productVariant.optionValues),
  );
  // orderItem quantity and status validations
  TestValidator.predicate(
    "has positive quantity",
    firstShipmentItem.orderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "has unitPrice",
    typeof firstShipmentItem.orderItem.unitPrice === "number",
  );
  TestValidator.predicate(
    "has status",
    firstShipmentItem.orderItem.status.length > 0,
  );
  // 8. The shipment is not soft-deleted (deleted_at is null)
  TestValidator.equals(
    "shipment is not deleted",
    retrievedShipment.deleted_at,
    null,
  );
}
