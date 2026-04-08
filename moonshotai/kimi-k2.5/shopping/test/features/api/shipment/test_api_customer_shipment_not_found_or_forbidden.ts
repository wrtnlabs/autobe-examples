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
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test customer shipment retrieval with business logic validation for resource existence and ownership boundaries.
 */
export async function test_api_customer_shipment_not_found_or_forbidden(
  connection: api.IConnection,
) {
  // ---------- Setup: Admin creates category ----------
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(adminAuth);
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // ---------- Setup: Seller registers and creates product ----------
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(sellerAuth);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: typia.random<string>(),
        description: typia.random<string>(),
        categoryId: category.id,
        basePrice: typia.random<number & tags.Minimum<1>>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: typia.random<string & tags.MinLength<1>>(),
          price: (typia.random<number & tags.Minimum<1>>()) satisfies number as number,
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        },
      },
    );
  typia.assert(variant);
  // ---------- Setup: Customer A registers and adds to cart ----------
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {},
  });
  typia.assert(customerAAuth);
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerAConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Create a shipment for the seller
  // Note: In real scenario, order items would come from an order. In simulation/mock mode,
  // the generate function handles the necessary setup
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        carrierName: "FedEx",
        trackingNumber: typia.random<string & tags.MinLength<5>>(),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // ---------- Scenario A: Non-existent shipment ID ----------
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent shipment should return 404",
    404,
    async () => {
      await api.functional.ecommerceMall.customer.shipments.at(
        customerAConnection,
        {
          shipmentId: nonExistentShipmentId,
        },
      );
    },
  );
  // ---------- Scenario B: Cross-customer access boundary ----------
  // Customer B registers
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {},
  });
  typia.assert(customerBAuth);
  // Customer B attempts to access Customer A's shipment - should get 404 or 403
  await TestValidator.httpError(
    "cross-customer shipment access should return 404 or 403",
    [404, 403],
    async () => {
      await api.functional.ecommerceMall.customer.shipments.at(
        customerBConnection,
        {
          shipmentId: shipment.id,
        },
      );
    },
  );
  // Customer A should still be able to retrieve their own shipment
  const customerAShipment =
    await api.functional.ecommerceMall.customer.shipments.at(
      customerAConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(customerAShipment);
  TestValidator.equals(
    "customer A can retrieve their own shipment",
    customerAShipment.id,
    shipment.id,
  );
}