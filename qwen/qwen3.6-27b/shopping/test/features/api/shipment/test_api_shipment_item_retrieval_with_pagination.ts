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
 * Test shipment item retrieval with pagination for a seller's shipment package.
 *
 * Validates the complete order fulfillment workflow from category creation through shipment item retrieval. An administrator creates a product category, a seller creates a product with variants, a customer places an order, and the seller bundles order items into a shipment. The test then retrieves all shipment items via the paginated endpoint to verify the junction records correctly link order items to their parent shipment.
 *
 * Special attention is given to verifying that each shipment item contains order item details (quantity, price, shipped status) and references the parent shipment with consistent carrier and tracking number. Pagination metadata correctly reflects the total number of items in the shipment package.
 *
 * 1. Administrator creates a product category for classification.
 * 2. Seller creates a product and variant within the category.
 * 3. Customer registers and adds a shipping address.
 * 4. Customer places an order including the seller's product variant.
 * 5. Seller creates a shipment bundling the order items with carrier tracking.
 * 6. Seller retrieves shipment items via paginated endpoint with default parameters.
 * 7. Validates that all order items have shipped status and share shipment tracking info.
 */
export async function test_api_shipment_item_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category for product classification
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(category);
  // 2. Seller creates product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: typia.random<string & tags.Format<"password">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(variant);
  // 3. Customer registers and adds shipping address
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: { isDefault: true } },
    );
  typia.assert(address);
  // 4. Customer places order with the seller's product variant
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        items: [
          {
            ecommerce_platform_product_variant_id: variant.id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >() satisfies number as number,
            price: typia.random<
              number & tags.Minimum<0>
            >() satisfies number as number,
          } satisfies IEcommercePlatformOrderItem.ICreate,
        ],
      },
    },
  );
  typia.assert(order);
  const orderItemIds: (string & tags.Format<"uuid">)[] = order.items.map(
    (item) => item.id,
  );
  // 5. Seller creates shipment bundling the order items
  const shipment =
    await generate_random_ecommerce_platform_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds,
        },
      },
    );
  typia.assert(shipment);
  // 6. Retrieve shipment items with default pagination
  const itemsPage: IPageIEcommercePlatformShipmentItem.ISummary =
    await api.functional.ecommercePlatform.seller.shipments.items.index(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {} satisfies IEcommercePlatformShipmentItem.IRequest,
      },
    );
  typia.assert(itemsPage);
  // 7. Validate pagination metadata matches shipment
  TestValidator.equals(
    "pagination records match shipment item count",
    itemsPage.pagination.records,
    itemsPage.data.length,
  );
  TestValidator.predicate(
    "pagination has valid page limit",
    itemsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total pages is at least 1",
    itemsPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination current page is at least 1",
    itemsPage.pagination.current >= 1,
  );
  // Validate each shipment item
  for (const shipmentItem of itemsPage.data) {
    typia.assert(shipmentItem);
    // Order item should have shipped status after shipment creation
    TestValidator.equals(
      "order item status is shipped",
      shipmentItem.orderItem.status,
      "shipped",
    );
    // Order item quantity should be positive
    TestValidator.predicate(
      "order item quantity is positive",
      shipmentItem.orderItem.quantity > 0,
    );
    // Order item price should be non-negative
    TestValidator.predicate(
      "order item price is non-negative",
      shipmentItem.orderItem.price >= 0,
    );
    // Shipment reference should match parent shipment carrier and tracking
    TestValidator.equals(
      "carrier name matches parent shipment",
      shipmentItem.shipment.carrier_name,
      shipment.carrier_name,
    );
    TestValidator.equals(
      "tracking number matches parent shipment",
      shipmentItem.shipment.tracking_number,
      shipment.tracking_number,
    );
  }
  // Validate all items share same shipment identifier
  const allSameShipmentId = itemsPage.data.every(
    (item) => item.shipment.id === shipment.id,
  );
  TestValidator.predicate(
    "all shipment items reference same shipment",
    allSameShipmentId,
  );
}
