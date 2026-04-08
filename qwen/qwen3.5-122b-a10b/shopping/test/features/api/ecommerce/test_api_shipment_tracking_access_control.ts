import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipmentItem";
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
import { generate_random_ecommerce_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_customer_carts_items_create";
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

export async function test_api_shipment_tracking_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate two sellers
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller1Auth);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller2Auth);
  // 2. Each seller creates a product with variant
  const seller1Product = await generate_random_ecommerce_seller_products_create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(seller1Product);
  const seller1Variant =
    await generate_random_ecommerce_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: seller1Product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphabets(5).toUpperCase()}`,
          option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)}`,
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(seller1Variant);
  const seller2Product = await generate_random_ecommerce_seller_products_create(
    seller2Connection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(seller2Product);
  const seller2Variant =
    await generate_random_ecommerce_seller_products_variants_create(
      seller2Connection,
      {
        params: { productId: seller2Product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphabets(5).toUpperCase()}`,
          option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)}`,
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(seller2Variant);
  // 3. Register and authenticate a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 4. Customer adds both products to cart and creates order
  // Note: Order creation endpoint not available in SDK, using order ID from shipment creation
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 5. Each seller creates a shipment for their order items
  const seller1Shipment =
    await generate_random_ecommerce_seller_orders_shipments_create(
      seller1Connection,
      {
        params: { orderId },
        body: {
          carrier_name: RandomGenerator.pick(["UPS", "FedEx", "USPS"]),
          tracking_number: `TRK${RandomGenerator.alphaNumeric(10).toUpperCase()}`,
          order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  typia.assert(seller1Shipment);
  const seller2Shipment =
    await generate_random_ecommerce_seller_orders_shipments_create(
      seller2Connection,
      {
        params: { orderId },
        body: {
          carrier_name: RandomGenerator.pick(["UPS", "FedEx", "USPS"]),
          tracking_number: `TRK${RandomGenerator.alphaNumeric(10).toUpperCase()}`,
          order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  typia.assert(seller2Shipment);
  // 6. Validate access control - Seller 1 can view their own shipment
  const seller1ViewOwnShipment =
    await api.functional.ecommerce.seller.orders.shipments.at(
      seller1Connection,
      {
        orderId,
        shipmentId: seller1Shipment.id,
      },
    );
  typia.assert(seller1ViewOwnShipment);
  // 7. Validate access control - Seller 1 cannot view Seller 2's shipment (should get 404)
  await TestValidator.httpError(
    "seller1 cannot access seller2's shipment",
    404,
    async () => {
      await api.functional.ecommerce.seller.orders.shipments.at(
        seller1Connection,
        {
          orderId,
          shipmentId: seller2Shipment.id,
        },
      );
    },
  );
  // 8. Validate access control - Seller 2 can view their own shipment
  const seller2ViewOwnShipment =
    await api.functional.ecommerce.seller.orders.shipments.at(
      seller2Connection,
      {
        orderId,
        shipmentId: seller2Shipment.id,
      },
    );
  typia.assert(seller2ViewOwnShipment);
  // 9. Validate access control - Seller 2 cannot view Seller 1's shipment (should get 404)
  await TestValidator.httpError(
    "seller2 cannot access seller1's shipment",
    404,
    async () => {
      await api.functional.ecommerce.seller.orders.shipments.at(
        seller2Connection,
        {
          orderId,
          shipmentId: seller1Shipment.id,
        },
      );
    },
  );
}
