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
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shipment } from "../../../prepare/prepare_random_ecommerce_platform_shipment";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Authorization boundary test verifying sellers cannot delete another seller's shipment.
 *
 * Validates that the shipment deletion endpoint enforces strict ownership checks. When a seller attempts to delete a shipment they do not own, the system must reject the request with a 403 Forbidden error. This prevents unauthorized sellers from interfering with other sellers' shipment data.
 *
 * The test establishes a complete commerce flow: product creation, order placement, and shipment generation by the rightful owner (Seller A), then performs the unauthorized deletion attempt by Seller B.
 *
 * 1. Admin registers, creates product category.
 * 2. Seller A (owner) registers, creates product and variant.
 * 3. Customer registers, creates shipping address, places order.
 * 4. Seller A creates shipment bundling the order item.
 * 5. Seller B (intruder) registers.
 * 6. Seller B attempts to delete Seller A's shipment.
 * 7. System rejects with 403 Forbidden, shipment remains active.
 */
export async function test_api_shipment_delete_forbidden_different_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registers and creates product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: undefined });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      { body: undefined },
    );
  typia.assert(category);
  // 2. Seller A (owner) registers and creates product + variant
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, { body: undefined });
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerAConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerAConnection,
      { body: undefined, params: { productId: product.id } },
    );
  typia.assert(variant);
  // 3. Customer registers, creates shipping address, places order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: undefined });
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: undefined },
    );
  typia.assert(address);
  const order = await api.functional.ecommercePlatform.customer.orders.create(
    customerConnection,
    {
      body: {
        items: [
          {
            ecommerce_platform_product_variant_id: variant.id,
            quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
            price: product.base_price satisfies number & tags.Minimum<0>,
          },
        ],
        shipping_address_id: address.id,
      } satisfies IEcommercePlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // 4. Seller A creates shipment bundling the order item
  const shipment =
    await generate_random_ecommerce_platform_seller_shipments_create(
      sellerAConnection,
      { body: { orderItemIds: order.items.map((item) => item.id) } },
    );
  typia.assert(shipment);
  // 5. Seller B (intruder) registers
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, { body: undefined });
  // 6. Seller B attempts to delete Seller A's shipment - should fail with 403
  await TestValidator.httpError(
    "intruder seller cannot erase another seller's shipment",
    403,
    async () =>
      await api.functional.ecommercePlatform.seller.shipments.erase(
        sellerBConnection,
        { shipmentId: shipment.id },
      ),
  );
}
