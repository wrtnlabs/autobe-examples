import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test the primary success path where an authenticated seller retrieves their own shipment details.
 *
 * Scenario:
 * 1. Seller joins and authenticates
 * 2. Admin creates a category
 * 3. Seller creates a product in the category
 * 4. Seller creates a variant with stock for the product
 * 5. Customer joins and authenticates
 * 6. Customer adds the variant to cart
 * 7. Customer checks out, creating an order with 'paid' status order items
 * 8. Seller creates a shipment for the paid order items
 * 9. Seller retrieves the shipment details
 * 10. Validate the response contains correct carrier, tracking, shippedAt, order items with snapshots
 * 11. Verify order items' status changed from 'paid' to 'shipped'
 */
export async function test_api_shipment_retrieval_own_shipment_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connections and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  // 2. Admin creates a category
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: null,
        },
      },
    );
  typia.assert(category);
  // 3. Seller creates a product in the category
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          categoryId: category.id,
          basePrice: typia.random<
            number & tags.Minimum<100> & tags.Maximum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 4. Seller creates a variant with initial stock for the product
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
                "White",
              ]),
            },
            {
              optionName: "Size",
              optionValue: RandomGenerator.pick(["S", "M", "L", "XL"]),
            },
          ],
          price: typia.random<
            number & tags.Minimum<100> & tags.Maximum<1000>
          >(),
          stock: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 5. Customer adds the variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 6. Customer checks out, creating an order with 'paid' status order items
  const order: IEcommerceMallOrder =
    await generate_random_ecommerce_mall_customer_checkout_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(2),
          recipientPhone: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postalCode: RandomGenerator.alphaNumeric(5),
          country: RandomGenerator.pick(["USA", "KOR", "JPN", "GBR", "DEU"]),
        },
      },
    );
  typia.assert(order);
  // Verify order has paid items
  TestValidator.predicate("order has order items", order.orderItems.length > 0);
  TestValidator.predicate(
    "order item status is paid",
    order.orderItems.every((item) => item.status === "paid"),
  );
  // Get the order item IDs for shipment
  const orderItemIds: string[] = order.orderItems.map((item) => (item as IEcommerceMallOrderItem & IEntity).id);
  // 7. Seller creates a shipment for the paid order items
  const createdShipment: IEcommerceMallShipment =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: orderItemIds as (string & tags.Format<"uuid">)[],
          carrierName: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
          trackingNumber: `TRK-${RandomGenerator.alphaNumeric(12).toUpperCase()}`,
        },
      },
    );
  typia.assert(createdShipment);
  // Verify the created shipment has the shipment items
  TestValidator.predicate(
    "shipment has shipment items",
    createdShipment.shipmentItems.length > 0,
  );
  // 8. Seller retrieves the shipment details
  const retrievedShipment: IEcommerceMallShipment =
    await api.functional.ecommerceMall.seller.shipments.at(sellerConnection, {
      shipmentId: createdShipment.id,
    });
  typia.assert(retrievedShipment);
  // 9. Validate the response structure and content
  TestValidator.equals(
    "shipment id matches",
    retrievedShipment.id,
    createdShipment.id,
  );
  TestValidator.equals(
    "carrier name matches",
    retrievedShipment.carrierName,
    createdShipment.carrierName,
  );
  TestValidator.equals(
    "tracking number matches",
    retrievedShipment.trackingNumber,
    createdShipment.trackingNumber,
  );
  TestValidator.predicate(
    "shippedAt is a valid timestamp",
    retrievedShipment.shippedAt !== null,
  );
  TestValidator.predicate(
    "createdAt is valid",
    retrievedShipment.createdAt !== null,
  );
  TestValidator.predicate(
    "updatedAt is valid",
    retrievedShipment.updatedAt !== null,
  );
  // Validate seller information in shipment
  TestValidator.predicate(
    "seller info is populated",
    retrievedShipment.seller !== null,
  );
  TestValidator.equals(
    "seller id matches",
    retrievedShipment.seller.id,
    sellerAuthorized.id,
  );
  // Validate order information in shipment
  TestValidator.predicate(
    "order info is populated",
    retrievedShipment.order !== null,
  );
  TestValidator.equals(
    "order id matches",
    retrievedShipment.order.id,
    order.id,
  );
  TestValidator.equals(
    "order number matches",
    retrievedShipment.order.orderNumber,
    order.orderNumber,
  );
  // Validate shipment items
  TestValidator.predicate(
    "shipment items are populated",
    retrievedShipment.shipmentItems.length > 0,
  );
  TestValidator.equals(
    "shipment items count matches",
    retrievedShipment.shipmentItems.length,
    createdShipment.shipmentItems.length,
  );
  // 10. Verify order items' status changed from 'paid' to 'shipped'
  for (const shipmentItem of retrievedShipment.shipmentItems) {
    TestValidator.predicate(
      "order item status is shipped",
      shipmentItem.orderItem.status === "shipped",
    );
    TestValidator.predicate(
      "order item has product snapshot",
      shipmentItem.orderItem.product !== null,
    );
    TestValidator.predicate(
      "order item has variant snapshot",
      shipmentItem.orderItem.variant !== null,
    );
    TestValidator.predicate(
      "order item has seller snapshot",
      shipmentItem.orderItem.seller !== null,
    );
  }
  // Validate delivery is null (not yet delivered)
  TestValidator.equals(
    "delivery is null for non-delivered shipment",
    retrievedShipment.delivery,
    null,
  );
}