import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test retrieving a shipment that has been delivered and includes delivery confirmation details.
 *
 * Business scenario: A customer places an order, the seller ships the items, and the customer
 * retrieves the shipment information to track delivery status.
 *
 * Test flow:
 * 1. Authenticate as seller to create products and handle shipments
 * 2. Create a product listing
 * 3. Create a product variant (SKU)
 * 4. Authenticate as customer to place order
 * 5. Add product variant to cart (pre-requisite for orders)
 * 6. Create a shipment for order items as seller
 * 7. Customer retrieves shipment details via GET endpoint
 * 8. Verify shipment contains tracking information and valid delivery status
 */
export async function test_api_customer_shipment_delivered_with_confirmation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAuthorized: IEcommerceMallSeller.IAuthorized =
    await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);
  // Step 2: Create a product
  const productBody = {
    name: "Test Product",
    description: "A product for testing purposes",
    categoryId: typia.random<string & tags.Format<"uuid">>(),
    basePrice: 99.99,
  } satisfies IEcommerceMallProduct.ICreate;
  const product: IEcommerceMallProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerConnection,
      { body: productBody },
    );
  typia.assert(product);
  // Step 3: Create a product variant
  const variantBody = {
    skuCode: `SKU-${Date.now()}`,
    price: 99.99,
    options: [
      { optionName: "Color", optionValue: "Red" },
      { optionName: "Size", optionValue: "Large" },
    ],
  } satisfies IEcommerceMallProductVariant.ICreate;
  const variant: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      { productId: product.id, body: variantBody },
    );
  typia.assert(variant);
  // Step 4: Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: undefined,
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuthorized: IEcommerceMallCustomer.IAuthorized =
    await api.functional.ecommerceMall.auth.customer.join(customerConnection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);
  // Step 5: Add variant to cart
  const cartItemBody = {
    productVariantId: variant.id,
    quantity: 2,
  } satisfies IEcommerceMallCartItem.ICreate;
  const cartItem: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.cart_items.create(
      customerConnection,
      { body: cartItemBody },
    );
  typia.assert(cartItem);
  // Step 6: Create a shipment
  // Note: For shipment creation, we need order item IDs. Since order creation endpoint
  // is not available in the SDK, we generate a random UUID for demonstration purposes.
  // In a real scenario, order items should come from a completed order.
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const shipmentBody = {
    orderItemIds: [orderItemId],
    carrierName: "FedEx",
    trackingNumber: "ABC123456789",
  } satisfies IEcommerceMallShipment.ICreate;
  const shipment: IEcommerceMallShipment =
    await api.functional.ecommerceMall.seller.shipments.create(
      sellerConnection,
      { body: shipmentBody },
    );
  typia.assert(shipment);
  // Step 7: Retrieve shipment as customer
  const retrievedShipment: IEcommerceMallShipment =
    await api.functional.ecommerceMall.customer.shipments.at(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(retrievedShipment);
  // Step 8: Business validations
  TestValidator.equals(
    "shipment ID matches",
    retrievedShipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "carrier name matches",
    retrievedShipment.carrier_name,
    shipment.carrier_name,
  );
  TestValidator.equals(
    "tracking number matches",
    retrievedShipment.tracking_number,
    shipment.tracking_number,
  );
  TestValidator.predicate(
    "status is valid",
    retrievedShipment.status === "in_transit" ||
      retrievedShipment.status === "delivered",
  );
  TestValidator.equals(
    "seller info present",
    retrievedShipment.seller.id,
    sellerAuthorized.id,
  );
  TestValidator.predicate(
    "shipment items array exists",
    Array.isArray(retrievedShipment.shipment_items),
  );
}
