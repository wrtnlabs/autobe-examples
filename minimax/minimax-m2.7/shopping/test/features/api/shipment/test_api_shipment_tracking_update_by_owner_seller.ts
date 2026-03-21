import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test that a seller can successfully update the tracking information
 * (carrier name and tracking number) of their own shipment.
 *
 * Steps:
 * 1. Register and approve a seller account
 * 2. Create a product with category and variants with inventory
 * 3. Register a customer account and add shipping address
 * 4. Customer adds product variant to cart and completes checkout
 * 5. Seller creates a shipment with initial carrier and tracking number
 * 6. Seller calls PUT /seller/shipments/{shipmentId} with updated carrier and tracking number
 *
 * Validation:
 * - Response returns 200 OK with updated shipment entity
 * - Carrier name is updated to the new value
 * - Tracking number is updated to the new value
 * - updated_at timestamp is refreshed
 * - All shipment_items remain associated with the shipment
 */
export async function test_api_shipment_tracking_update_by_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and approve a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Step 2: Create a product with category and variants with inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Get the variant ID from the product
  const variant = product.variants[0];
  const variantId = variant.id;
  // Step 3: Register a customer account and add shipping address
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Create shipping address for checkout
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // Step 4: Customer adds product variant to cart and completes checkout
  // Add item to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variantId,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Complete checkout - payment_token can be any non-empty string for test
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: RandomGenerator.alphaNumeric(32),
          address_id: address.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Get the order item ID from the order
  const orderItem = order.orderItems[0];
  const orderItemId = orderItem.id;
  // Step 5: Seller creates a shipment with initial carrier and tracking number
  const initialCarrier = "DHL";
  const initialTrackingNumber = "DHL123456789";
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItemId],
        carrier: initialCarrier,
        trackingNumber: initialTrackingNumber,
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Capture the initial updated_at timestamp
  const initialUpdatedAt = shipment.updated_at;
  // Step 6: Seller calls PUT /seller/shipments/{shipmentId} with updated carrier and tracking number
  const newCarrier = "FedEx";
  const newTrackingNumber = "FEDEX987654321";
  const updatedShipment =
    await api.functional.ecommerceMall.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          carrier: newCarrier,
          trackingNumber: newTrackingNumber,
        } satisfies IEcommerceMallShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // Step 7: Validations
  // Carrier name is updated to the new value
  TestValidator.equals("carrier updated", updatedShipment.carrier, newCarrier);
  // Tracking number is updated to the new value
  TestValidator.equals(
    "tracking number updated",
    updatedShipment.tracking_number,
    newTrackingNumber,
  );
  // updated_at timestamp is refreshed (should be newer than initial)
  TestValidator.predicate(
    "updated_at refreshed",
    new Date(updatedShipment.updated_at).getTime() >=
      new Date(initialUpdatedAt).getTime(),
  );
  // All shipment_items remain associated with the shipment
  TestValidator.equals(
    "shipment items count preserved",
    updatedShipment.shipment_items.length,
    shipment.shipment_items.length,
  );
  TestValidator.equals(
    "first shipment item preserved",
    updatedShipment.shipment_items[0].id,
    shipment.shipment_items[0].id,
  );
  // Verify the shipment still belongs to the correct seller
  TestValidator.equals(
    "seller preserved",
    updatedShipment.seller.id,
    sellerAuth.id,
  );
  // Verify the shipment still belongs to the correct order
  TestValidator.equals("order preserved", updatedShipment.order.id, order.id);
}
