import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShipmentItem";
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
import { generate_random_ecommerce_platform_customer_orders_create } from "../../../generate/generate_random_ecommerce_platform_customer_orders_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_shipments_create } from "../../../generate/generate_random_ecommerce_platform_seller_shipments_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shipment } from "../../../prepare/prepare_random_ecommerce_platform_shipment";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test multi-seller shipment separation enforcing same-seller grouping rule.
 *
 * Validates the multi-seller marketplace business rule where order items from different sellers must be processed independently with separate shipments per seller. Two sellers create products and variants, then a customer places a single order containing items from both sellers. The first seller creates a shipment bundling only their own order items, and the shipment items are retrieved for verification.
 *
 * The core business rule being tested is cross-seller isolation: items from different sellers cannot be bundled into the same shipment package. This ensures that each seller maintains independent fulfillment responsibility for their own products.
 *
 * Special attention is given to verifying that the shipment items response contains only order items belonging to the first seller's products, that items from the second seller are excluded, and that each shipment item correctly references the parent shipment with shared carrier tracking information.
 *
 * 1. Administrator joins platform and creates product category.
 * 2. Seller 1 registers, creates product listing, and creates product variant with SKU.
 * 3. Seller 2 registers, creates a different product listing, and creates product variant.
 * 4. Customer registers and adds delivery shipping address.
 * 5. Customer places multi-seller order containing items from both sellers.
 * 6. Seller 1 creates shipment bundling only their own order items.
 * 7. Seller 1 retrieves shipment items and validates same-seller separation rule.
 */
export async function test_api_shipment_multi_seller_separation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins platform and creates product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: { email: "multi-seller-test-admin@example.com" },
  });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      { body: { parentEcommercePlatformCategoryId: null } },
    );
  typia.assert(category);
  // 2. Seller 1 registers, creates product listing, and creates product variant with SKU
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {
    body: { email: "seller1-multiseller@example.com" },
  });
  const seller1Product =
    await generate_random_ecommerce_platform_seller_products_create(
      seller1Connection,
      { body: { category_id: category.id } },
    );
  typia.assert(seller1Product);
  const seller1Variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      seller1Connection,
      { params: { productId: seller1Product.id } },
    );
  typia.assert(seller1Variant);
  // 3. Seller 2 registers, creates a different product, and creates product variant
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {
    body: { email: "seller2-multiseller@example.com" },
  });
  const seller2Product =
    await generate_random_ecommerce_platform_seller_products_create(
      seller2Connection,
      { body: { category_id: category.id } },
    );
  typia.assert(seller2Product);
  const seller2Variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      seller2Connection,
      { params: { productId: seller2Product.id } },
    );
  typia.assert(seller2Variant);
  // 4. Customer registers and adds delivery shipping address
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: { email: "customer-multiseller@example.com" },
  });
  const shippingAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(shippingAddress);
  // 5. Customer places multi-seller order containing items from both sellers
  // Use SDK directly to control which product variants are included in the order
  const orderItems = [
    {
      ecommerce_platform_product_variant_id: seller1Variant.id,
      quantity: 1,
      price: 100,
    },
    {
      ecommerce_platform_product_variant_id: seller2Variant.id,
      quantity: 1,
      price: 100,
    },
  ] satisfies IEcommercePlatformOrderItem.ICreate[] & tags.MinItems<1>;
  const orderBody = {
    items: orderItems,
    shipping_address_id: shippingAddress.id,
  } satisfies IEcommercePlatformOrder.ICreate;
  const order = await api.functional.ecommercePlatform.customer.orders.create(
    customerConnection,
    { body: orderBody },
  );
  typia.assert(order);
  TestValidator.equals(
    "order contains two items from different sellers",
    order.items.length,
    2,
  );
  // Extract order item IDs for shipment creation
  const seller1OrderItemId = order.items.find(
    (item) => item.productVariant.sku_code === seller1Variant.sku_code,
  )!.id;
  const seller2OrderItemId = order.items.find(
    (item) => item.productVariant.sku_code === seller2Variant.sku_code,
  )!.id;
  // 6. Seller 1 creates shipment bundling only their own order items
  const shipmentBody = {
    carrierName: "MultiSellerTestCarrier",
    trackingNumber: "TEST-TRACKING-" + RandomGenerator.alphaNumeric(10),
    orderItemIds: [seller1OrderItemId],
  } satisfies IEcommercePlatformShipment.ICreate;
  const shipment =
    await generate_random_ecommerce_platform_seller_shipments_create(
      seller1Connection,
      { body: shipmentBody },
    );
  typia.assert(shipment);
  // 7. Seller 1 retrieves shipment items and validates separation rule
  const shipmentItemsPage =
    await api.functional.ecommercePlatform.seller.shipments.items.index(
      seller1Connection,
      {
        shipmentId: shipment.id,
        body: {} satisfies IEcommercePlatformShipmentItem.IRequest,
      },
    );
  typia.assert(shipmentItemsPage);
  // 7.1 Validate shipment contains only seller1's item (not seller2's)
  TestValidator.equals(
    "shipment contains only one order item from seller1",
    shipmentItemsPage.data.length,
    1,
  );
  TestValidator.equals(
    "shipment item matches seller1 order item id",
    shipmentItemsPage.data[0].orderItem.id,
    seller1OrderItemId,
  );
  TestValidator.predicate("shipment does NOT contain seller2 order item", () =>
    shipmentItemsPage.data.every(
      (shipmentItem) => shipmentItem.orderItem.id !== seller2OrderItemId,
    ),
  );
  // 7.2 Validate each shipment item references parent shipment with shared carrier
  TestValidator.equals(
    "shipment item references correct parent shipment",
    shipmentItemsPage.data[0].shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "shipment item shares parent carrier name",
    shipmentItemsPage.data[0].shipment.carrier_name,
    shipment.carrier_name,
  );
}
