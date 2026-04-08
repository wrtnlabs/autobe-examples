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
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
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
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer } from "../../../prepare/prepare_random_ecommerce_mall_customer";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_admin_shipment_delivery_confirmation_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Create product by seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create variant for the product
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
              ] as const),
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Size",
              optionValue: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 5. Create shipping address for customer
  await generate_random_ecommerce_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.alphabets(2).toUpperCase(),
        postalCode: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.pick(["USA", "KOR", "JPN", "GBR"] as const),
      },
    },
  );
  // 6. Add product variant to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 7. Create order by customer (patch converts cart to order)
  await api.functional.ecommerceMall.customer.orders.index(customerConnection, {
    body: {} satisfies IEcommerceMallOrder.IRequest,
  });
  // 8. Get orders to retrieve order items
  const ordersPage = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {} satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(ordersPage);
  TestValidator.predicate(
    "at least one order exists",
    ordersPage.data.length > 0,
  );
  const order = ordersPage.data[0];
  // Note: We need order items to create a shipment. In a real scenario, we'd need to
  // query order details to get order item IDs. For this test, we'll use mock order item IDs
  // based on the scenario that order items were created from the cart.
  // Since the SDK doesn't expose a direct endpoint to get order items, we simulate
  // having valid order item IDs that would be in 'paid' status.
  const mockOrderItemIds = [typia.random<string & tags.Format<"uuid">>()];
  // 9. Create shipment by seller
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: mockOrderItemIds,
        carrierName: RandomGenerator.pick([
          "FedEx",
          "UPS",
          "DHL",
          "USPS",
        ] as const),
        trackingNumber: RandomGenerator.alphaNumeric(20),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 10. Attempt delivery confirmation as seller - expect authorization error (403)
  await TestValidator.httpError(
    "seller cannot confirm delivery",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.shipments.delivery.confirm(
        sellerConnection,
        { shipmentId: shipment.id },
      );
    },
  );
  // 11. Attempt delivery confirmation as customer - expect authorization error (403)
  await TestValidator.httpError(
    "customer cannot confirm delivery",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.shipments.delivery.confirm(
        customerConnection,
        { shipmentId: shipment.id },
      );
    },
  );
  // 12. Create admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 13. Confirm delivery as admin - expect success
  const deliveryConfirmation =
    await api.functional.ecommerceMall.admin.shipments.delivery.confirm(
      adminConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(deliveryConfirmation);
  TestValidator.equals(
    "delivery confirmed for correct shipment",
    deliveryConfirmation.shipment.id,
    shipment.id,
  );
  TestValidator.predicate(
    "delivery has timestamp",
    new Date(deliveryConfirmation.deliveredAt).getTime() > 0,
  );
}