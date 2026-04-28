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
 * Test shipment retrieval preserves original order item prices after variant price updates.
 *
 * Validates the complete purchase and fulfillment flow: admin creates a product category, seller creates a product with a variant at an initial price, customer purchases the variant at that price, and seller updates the variant price to a different value after the purchase. When the seller creates and retrieves a shipment containing the order item, the order item price in the shipment response remains immutable at the original purchase price, demonstrating that order item prices serve as historical financial records that never change even when product variant prices are subsequently modified.
 *
 * 1. Admin joins and creates a product category.
 * 2. Seller joins and creates a product with a variant at initial price.
 * 3. Customer joins, creates shipping address, and places order at that price.
 * 4. Seller updates variant price to a different (higher) value after purchase.
 * 5. Seller creates shipment bundling the order item.
 * 6. Seller retrieves shipment and validates order item price equals original purchase price.
 */
export async function test_api_shipment_retrieval_order_item_price_immutability(
  connection: api.IConnection,
) {
  // 1. Admin: join and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: { email: typia.random<string & tags.Format<"email">>() },
  });
  const adminCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(adminCategory);
  // 2. Seller: join, create product, create variant with initial price
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail },
  });
  const initialPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const sellerProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: adminCategory.id } },
    );
  typia.assert(sellerProduct);
  const sellerVariant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        body: { price: initialPrice },
        params: { productId: sellerProduct.id },
      },
    );
  typia.assert(sellerVariant);
  // 3. Customer: join, create shipping address, create order at initial price
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: { email: customerEmail },
  });
  const customerAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(customerAddress);
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: customerAddress.id,
        items: [
          {
            ecommerce_platform_product_variant_id: sellerVariant.id,
            quantity: 2,
            price: initialPrice,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 4. Seller: update variant price to a different value after the purchase
  const updatedPrice: number = initialPrice * 2;
  const updatedVariant =
    await api.functional.ecommercePlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId: sellerProduct.id,
        variantId: sellerVariant.id,
        body: {
          price: updatedPrice,
        } satisfies IEcommercePlatformProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Seller: create shipment with the paid order item
  const orderItemId: string & tags.Format<"uuid"> = order.items[0].id;
  const shipment =
    await api.functional.ecommercePlatform.seller.shipments.create(
      sellerConnection,
      {
        body: {
          carrierName: RandomGenerator.paragraph({ sentences: 2 }),
          trackingNumber: RandomGenerator.alphaNumeric(10),
          orderItemIds: [orderItemId],
        } satisfies IEcommercePlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 6. Seller: retrieve shipment and validate order item price immutability
  const retrievedShipment =
    await api.functional.ecommercePlatform.seller.shipments.at(
      sellerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(retrievedShipment);
  // Validate: order item price in shipment equals original purchase price
  TestValidator.equals(
    "order item price captures original purchase price",
    retrievedShipment.shipmentItems[0].orderItem.price,
    initialPrice,
  );
  TestValidator.notEquals(
    "order item price differs from updated variant price",
    retrievedShipment.shipmentItems[0].orderItem.price,
    updatedPrice,
  );
}
