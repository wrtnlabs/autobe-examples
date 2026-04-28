import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import type { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
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
import { generate_random_ecommerce_platform_customer_orders_create } from "../../../generate/generate_random_ecommerce_platform_customer_orders_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_inventory_create";
import { generate_random_ecommerce_platform_seller_shipments_create } from "../../../generate/generate_random_ecommerce_platform_seller_shipments_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_inventory_record } from "../../../prepare/prepare_random_ecommerce_platform_inventory_record";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shipment } from "../../../prepare/prepare_random_ecommerce_platform_shipment";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test shipment update endpoint's ownership validation and immutability read-through behavior.
 *
 * Validates that a seller can call PUT on their own shipment with an empty request body, confirming that tracking information (carrier name, tracking number) remains immutable. The endpoint should verify seller ownership and return the unmodified shipment resource.
 *
 * The test follows the complete lifecycle: admin creates a category, seller creates a product with variants and inventory, customer places an order, and the seller bundles the order item into a shipment. The update operation serves as a read-through validation returning all current field values.
 *
 * 1. Admin joins and creates a product category.
 * 2. Seller joins, capturing credentials for subsequent login.
 * 3. Admin attempts to approve the seller's pending approval request.
 * 4. Seller logs in, creates a product, variant, and adds inventory stock.
 * 5. Customer joins, logs in, creates a shipping address, and places an order.
 * 6. Seller creates a shipment bundling the order item.
 * 7. Seller performs PUT update with empty body on their own shipment.
 * 8. Validates shipment fields remain unchanged: carrier name, tracking number, items, timestamps.
 */
export async function test_api_shipment_owner_readthrough_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller joins with stored password
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const joinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(joinConnection, {
    body: { password: sellerPassword },
  });
  typia.assert(sellerJoinResult);
  // 3. Admin attempts to approve seller (best effort - may not be needed)
  try {
    const approvalBody = {
      status: "approved",
      reason: null,
    } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate;
    await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
      adminConnection,
      {
        requestId: sellerJoinResult.id,
        body: approvalBody,
      },
    );
  } catch {
    // Approval may not be required for product creation
  }
  // 4. Seller logs in, creates product, variant, and adds stock
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLogin = {
    email: sellerJoinResult.email,
    password: sellerPassword,
    href: "https://test.com/",
    referrer: "https://test.com/",
  } satisfies IEcommercePlatformSeller.ILogin;
  await authorize_seller_login(sellerConnection, { body: sellerLogin });
  const productBody = {
    name: "Test Product",
    description: "A test product for E2E validation",
    base_price: 10000,
    category_id: category.id,
  } satisfies IEcommercePlatformProduct.ICreate;
  const product = await api.functional.ecommercePlatform.seller.products.create(
    sellerConnection,
    { body: productBody },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  const stock =
    await generate_random_ecommerce_platform_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: { quantity_delta: 10, reason: "Initial stock" },
      },
    );
  typia.assert(stock);
  // 5. Customer joins, logs in, creates address, places order
  const customerPassword = typia.random<string & tags.Format<"password">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinResult = await authorize_customer_join(customerConnection, {
    body: { password: customerPassword },
  });
  typia.assert(customerJoinResult);
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoinResult.email,
      password: customerPassword,
    } satisfies IEcommercePlatformCustomer.ILogin,
  });
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  const orderBody = {
    items: [
      {
        ecommerce_platform_product_variant_id: variant.id,
        quantity: 1,
        price: 10000,
      },
    ],
    shipping_address_id: address.id,
  } satisfies IEcommercePlatformOrder.ICreate;
  const order = await api.functional.ecommercePlatform.customer.orders.create(
    customerConnection,
    { body: orderBody },
  );
  typia.assert(order);
  TestValidator.equals(
    "order has at least one item",
    true,
    order.items.length >= 1,
  );
  // 6. Seller creates shipment with the order item
  const orderItemId = order.items[0].id;
  const shipmentBody = {
    carrierName: "TestCarrier",
    trackingNumber: "TRACK-001",
    orderItemIds: [orderItemId],
  } satisfies IEcommercePlatformShipment.ICreate;
  const newShipment =
    await api.functional.ecommercePlatform.seller.shipments.create(
      sellerConnection,
      {
        body: shipmentBody,
      },
    );
  typia.assert(newShipment);
  TestValidator.equals(
    "carrier name matches",
    newShipment.carrier_name,
    "TestCarrier",
  );
  TestValidator.equals(
    "tracking number matches",
    newShipment.tracking_number,
    "TRACK-001",
  );
  TestValidator.predicate(
    "shipment has items",
    newShipment.shipmentItems.length >= 1,
  );
  // 7. Seller updates shipment (empty body - read-through validation)
  const updateBody = {} satisfies IEcommercePlatformShipment.IUpdate;
  const updatedShipment =
    await api.functional.ecommercePlatform.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: newShipment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedShipment);
  // 8. Validate immutability and preserved fields
  TestValidator.equals(
    "shipment ID unchanged",
    updatedShipment.id,
    newShipment.id,
  );
  TestValidator.equals(
    "carrier name preserved",
    updatedShipment.carrier_name,
    newShipment.carrier_name,
  );
  TestValidator.equals(
    "tracking number preserved",
    updatedShipment.tracking_number,
    newShipment.tracking_number,
  );
  TestValidator.equals(
    "shipped_at preserved",
    updatedShipment.shipped_at,
    newShipment.shipped_at,
  );
  TestValidator.equals(
    "shipment items count preserved",
    updatedShipment.shipment_items_count,
    newShipment.shipment_items_count,
  );
  TestValidator.equals(
    "seller ID preserved",
    updatedShipment.seller.id,
    newShipment.seller.id,
  );
  TestValidator.predicate(
    "shipment items array populated",
    updatedShipment.shipmentItems.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    updatedShipment.created_at !== null &&
      updatedShipment.created_at !== undefined,
  );
}
