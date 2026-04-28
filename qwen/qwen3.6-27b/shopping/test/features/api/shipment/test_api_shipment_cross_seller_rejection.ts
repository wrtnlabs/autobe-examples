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
import { generate_random_ecommerce_platform_seller_shipments_items_create } from "../../../generate/generate_random_ecommerce_platform_seller_shipments_items_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shipment } from "../../../prepare/prepare_random_ecommerce_platform_shipment";
import { prepare_random_ecommerce_platform_shipment_item } from "../../../prepare/prepare_random_ecommerce_platform_shipment_item";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test cross-seller shipment rejection enforcing the same-seller grouping rule.
 *
 * Validates that order items from different sellers cannot be bundled into a single shipment. When Seller A attempts to add an order item belonging to Seller B's product to their existing shipment, the system must reject the request because all items in a shipment must originate from the same seller.
 *
 * This test exercises the transactional nature of the endpoint - the entire operation is aborted if any item fails the same-seller validation, ensuring data consistency across shipment and order item records.
 *
 * 1. Admin joins the platform and creates a product category.
 * 2. Seller A joins and creates a product with a variant in that category.
 * 3. Seller B joins and creates a second product with a variant in the same category.
 * 4. A customer joins, creates a shipping address, and places a multi-seller order containing items from both sellers.
 * 5. Seller A creates a shipment containing only their own order item.
 * 6. Seller A attempts to add Seller B's order item to their shipment via the target endpoint.
 * 7. The system rejects the request, enforcing the same-seller grouping rule.
 */
export async function test_api_shipment_cross_seller_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates a product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller A joins and creates their product with variant
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {});
  const productA =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerAConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(productA);
  const variantA =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerAConnection,
      { params: { productId: productA.id } },
    );
  typia.assert(variantA);
  // 3. Seller B joins and creates their product with variant
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  const productB =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerBConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(productB);
  const variantB =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerBConnection,
      { params: { productId: productB.id } },
    );
  typia.assert(variantB);
  // 4. Customer joins, creates address, and places multi-seller order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  const orderItems: IEcommercePlatformOrderItem.ICreate[] = [
    {
      ecommerce_platform_product_variant_id: variantA.id,
      quantity: 1 satisfies number as number,
      price: (productA.base_price ?? 10000) satisfies number as number,
    },
    {
      ecommerce_platform_product_variant_id: variantB.id,
      quantity: 1 satisfies number as number,
      price: (productB.base_price ?? 10000) satisfies number as number,
    },
  ];
  const order = await api.functional.ecommercePlatform.customer.orders.create(
    customerConnection,
    {
      body: {
        items: orderItems,
        shipping_address_id: address.id,
      } satisfies IEcommercePlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  const sellerAOrderItemId = order.items.find(
    (item) => item.productVariant.product.id === productA.id,
  )?.id;
  const sellerBOrderItemId = order.items.find(
    (item) => item.productVariant.product.id === productB.id,
  )?.id;
  TestValidator.predicate(
    "found seller A order item",
    sellerAOrderItemId != null,
  );
  TestValidator.predicate(
    "found seller B order item",
    sellerBOrderItemId != null,
  );
  // 5. Seller A creates a shipment with their own order item
  const shipment =
    await generate_random_ecommerce_platform_seller_shipments_create(
      sellerAConnection,
      {
        body: {
          orderItemIds: [sellerAOrderItemId!],
          carrierName: "TestCarrier",
          trackingNumber: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // 6. Seller A attempts to add Seller B's order item to their shipment
  // This should be rejected because Seller B's item belongs to a different seller
  await TestValidator.error("cross-seller shipment item rejected", async () => {
    await api.functional.ecommercePlatform.seller.shipments.items.create(
      sellerAConnection,
      {
        shipmentId: shipment.id,
        body: {
          order_item_ids: [sellerBOrderItemId!],
        } satisfies IEcommercePlatformShipmentItem.ICreate,
      },
    );
  });
}
