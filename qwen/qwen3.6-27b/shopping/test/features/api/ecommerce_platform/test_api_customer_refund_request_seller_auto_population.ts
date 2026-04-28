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
import type { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
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
import { generate_random_ecommerce_platform_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_platform_customer_refund_requests_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_shipments_create } from "../../../generate/generate_random_ecommerce_platform_seller_shipments_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_refund_request } from "../../../prepare/prepare_random_ecommerce_platform_refund_request";
import { prepare_random_ecommerce_platform_shipment } from "../../../prepare/prepare_random_ecommerce_platform_shipment";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test automatic population of seller profile during refund request creation.
 *
 * Validates that when a customer submits a refund request for a delivered order item, the system correctly traverses the product ownership chain (order item → product variant → product → seller profile) to auto-populate the seller_profile_id. Confirms the refund request response includes the seller profile with shop_name, shop_description, and logo_image_uri matching the seller who owns the product.
 *
 * Edge case coverage includes proper ownership linkage verification between the order item, product variant, product, and auto-derived seller profile, ensuring the entire chain is maintained correctly.
 *
 * 1. Administrator registers and logs in to the platform.
 * 2. Administrator creates a product category for product assignment.
 * 3. Seller registers (auto-creates approval request) and awaits admin approval.
 * 4. Administrator approves the seller registration request.
 * 5. Seller logs in after approval.
 * 6. Seller creates a product in the assigned category.
 * 7. Seller creates a product variant with SKU for purchase.
 * 8. Customer registers and logs in to the platform.
 * 9. Customer creates a shipping address for order delivery.
 * 10. Customer creates an order containing the product variant.
 * 11. Seller creates a shipment to dispatch the order item.
 * 12. Customer confirms delivery to transition item to delivered status.
 * 13. Customer creates a refund request for the delivered order item.
 * 14. Validates the refund request contains the correct auto-populated seller profile matching the product owner.
 */
export async function test_api_customer_refund_request_seller_auto_population(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers and logs in to the platform.
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: { email: adminEmail, password: adminPassword },
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost/login",
      referrer: "http://localhost/",
    },
  });
  // 2. Administrator creates a product category for product assignment.
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller registers (auto-creates approval request) and awaits admin approval.
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail, password: sellerPassword },
  });
  // 4. Administrator approves the seller registration request.
  await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
    adminConnection,
    {
      requestId: sellerJoin.id,
      body: { status: "approved" },
    },
  );
  // 5. Seller logs in after approval.
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "http://localhost/login",
      referrer: "http://localhost/",
    },
  });
  // 6. Seller creates a product in the assigned category.
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerLoginConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  const sellerProfileFromProduct = product.seller;
  // 7. Seller creates a product variant with SKU for purchase.
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 8. Customer registers and logs in to the platform.
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(customerConnection, {
    body: { email: customerEmail, password: customerPassword },
  });
  await authorize_customer_login(customerConnection, {
    body: { email: customerEmail, password: customerPassword },
  });
  // 9. Customer creates a shipping address for order delivery.
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 10. Customer creates an order containing the product variant.
  const variantPrice = (variant.price ??
    product.base_price) satisfies number as number;
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            ecommerce_platform_product_variant_id: variant.id,
            quantity: 1,
            price: variantPrice,
          },
        ],
        shipping_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  const orderItem = order.items[0];
  // 11. Seller creates a shipment to dispatch the order item.
  const shipment =
    await generate_random_ecommerce_platform_seller_shipments_create(
      sellerLoginConnection,
      {
        body: { orderItemIds: [orderItem.id] },
      },
    );
  typia.assert(shipment);
  // 12. Customer confirms delivery to transition item to delivered status.
  const confirmedShipment =
    await api.functional.ecommercePlatform.customer.shipments.confirm(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {},
      },
    );
  typia.assert(confirmedShipment);
  // 13. Customer creates a refund request for the delivered order item.
  const refundRequest =
    await generate_random_ecommerce_platform_customer_refund_requests_create(
      customerConnection,
      {
        body: { order_item_id: orderItem.id },
      },
    );
  typia.assert(refundRequest);
  // 14. Validates the refund request contains the correct auto-populated seller profile matching the product owner.
  TestValidator.equals(
    "seller profile ID matches product seller",
    refundRequest.sellerProfile.id,
    sellerProfileFromProduct.id,
  );
  TestValidator.equals(
    "seller shop name matches product seller",
    refundRequest.sellerProfile.shop_name,
    sellerProfileFromProduct.shop_name,
  );
  TestValidator.equals(
    "seller shop description matches product seller",
    refundRequest.sellerProfile.shop_description,
    sellerProfileFromProduct.shop_description,
  );
  TestValidator.equals(
    "seller logo image URI matches product seller",
    refundRequest.sellerProfile.logo_image_uri,
    sellerProfileFromProduct.logo_image_uri,
  );
  TestValidator.equals(
    "order item ID matches original order item",
    refundRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "refund status is pending",
    refundRequest.status,
    "pending",
  );
}