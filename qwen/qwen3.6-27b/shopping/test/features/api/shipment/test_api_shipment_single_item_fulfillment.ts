import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCheckout";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import type { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import type { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { generate_random_ecommerce_platform_customer_cart_checkout } from "../../../generate/generate_random_ecommerce_platform_customer_cart_checkout";
import { generate_random_ecommerce_platform_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_platform_customer_cart_items_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_shipments_create } from "../../../generate/generate_random_ecommerce_platform_seller_shipments_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_checkout } from "../../../prepare/prepare_random_ecommerce_platform_checkout";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shipment } from "../../../prepare/prepare_random_ecommerce_platform_shipment";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";
import { prepare_random_ecommerce_platform_shopping_cart_item } from "../../../prepare/prepare_random_ecommerce_platform_shopping_cart_item";

/**
 * Test single-item shipment fulfillment workflow.
 *
 * Validates the complete order fulfillment flow from product creation through shipment dispatch. An administrator creates a product category, a seller creates a product with a variant, and a customer purchases the variant through checkout to create a paid order item. The seller then dispatches the order item by creating a shipment with carrier tracking information.
 *
 * Special attention is given to verifying that the shipment record is created with the shipped_at timestamp set and delivery timestamps (confirmed_at, delivered_at) remaining null. The shipment junction table correctly links the order item, and the order item's fulfillment status transitions from "paid" to "shipped". The response includes the nested shipmentItems array containing the bundled order item details along with the immutable carrier name and tracking number.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and creates a product assigned to the category.
 * 3. Seller creates a product variant with options for the product.
 * 4. Customer registers with email and credentials.
 * 5. Customer creates a shipping address for delivery.
 * 6. Customer adds the product variant to their shopping cart.
 * 7. Customer checks out, creating a paid order with a single order item.
 * 8. Seller creates a shipment bundling the order item with carrier tracking.
 * 9. Validates shipment details: shipped_at set, confirmed_at null, delivered_at null, shipmentItems contains order item, and order item status is "shipped".
 */
export async function test_api_shipment_single_item_fulfillment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registers and creates a product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers and creates a product
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail, password: sellerPassword },
  });
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 3. Seller creates a product variant
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 4. Customer registers
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 5. Customer creates a shipping address
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 6. Customer adds variant to cart
  await generate_random_ecommerce_platform_customer_cart_items_create(
    customerConnection,
    { body: { product_variant_id: variant.id, quantity: 1 } },
  );
  // 7. Customer checks out, creating paid order
  const order = await generate_random_ecommerce_platform_customer_cart_checkout(
    customerConnection,
    { body: { shipping_address_id: address.id } },
  );
  typia.assert(order);
  // Extract the order item ID from the checkout response
  const orderItemId: string & tags.Format<"uuid"> = order.items[0].id;
  // 8. Seller creates shipment with single order item
  const shipmentBody = {
    carrierName: "FedEx",
    trackingNumber: RandomGenerator.alphabets(12),
    orderItemIds: [orderItemId],
  } satisfies IEcommercePlatformShipment.ICreate;
  const shipment =
    await api.functional.ecommercePlatform.seller.shipments.create(
      sellerConnection,
      { body: shipmentBody },
    );
  typia.assert(shipment);
  // 9. Validate shipment details
  TestValidator.equals(
    "carrier name matches",
    shipment.carrier_name,
    shipmentBody.carrierName,
  );
  TestValidator.equals(
    "tracking number matches",
    shipment.tracking_number,
    shipmentBody.trackingNumber,
  );
  TestValidator.predicate(
    "shipped_at is set",
    shipment.shipped_at !== undefined,
  );
  TestValidator.equals("confirmed_at is null", shipment.confirmed_at, null);
  TestValidator.equals("delivered_at is null", shipment.delivered_at, null);
  // Validate shipment items composition
  TestValidator.predicate(
    "shipment has one item",
    shipment.shipmentItems.length === 1,
  );
  const shipmentItem = shipment.shipmentItems[0];
  TestValidator.equals(
    "shipment item matches order item",
    shipmentItem.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "order item status is shipped",
    shipmentItem.orderItem.status,
    "shipped",
  );
  // Validate shipment item references
  TestValidator.equals(
    "shipment item references correct shipment",
    shipmentItem.shipment.id,
    shipment.id,
  );
}
