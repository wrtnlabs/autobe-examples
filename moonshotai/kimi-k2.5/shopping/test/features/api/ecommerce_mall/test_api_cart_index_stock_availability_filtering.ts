import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_cart_index_stock_availability_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller and create product infrastructure
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 2. Add limited inventory (2 units) to variant
  const inventory: IEcommerceMallInventoryRecord =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: { quantity: 2, reason: "Initial stock" },
      },
    );
  typia.assert(inventory);
  // 3. Setup customer and add item to cart with quantity exceeding stock (5 units)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const cartItem: IEcommerceMallCartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: { productVariantId: variant.id, quantity: 5 },
      },
    );
  typia.assert(cartItem);
  // 4. Test available filter - should exclude items exceeding stock (5 > 2)
  const availableCart: IPageIEcommerceMallCartItem.ISummary =
    await api.functional.ecommerceMall.customer.cart.index(customerConnection, {
      body: {
        cursor: null,
        limit: 10,
        product_id: null,
        variant_id: null,
        min_quantity: null,
        availability_status: "available",
        search: null,
      } satisfies IEcommerceMallCartItem.IRequest,
    });
  typia.assert(availableCart);
  TestValidator.equals(
    "available filter excludes items exceeding stock",
    availableCart.data.length,
    0,
  );
  // 5. Test unavailable filter - should include out-of-stock items
  const unavailableCart: IPageIEcommerceMallCartItem.ISummary =
    await api.functional.ecommerceMall.customer.cart.index(customerConnection, {
      body: {
        cursor: null,
        limit: 10,
        product_id: null,
        variant_id: null,
        min_quantity: null,
        availability_status: "unavailable",
        search: null,
      } satisfies IEcommerceMallCartItem.IRequest,
    });
  typia.assert(unavailableCart);
  TestValidator.equals(
    "unavailable filter includes out-of-stock items",
    unavailableCart.data.length,
    1,
  );
  TestValidator.equals(
    "unavailable item has correct variant id",
    unavailableCart.data[0].productVariant.id,
    variant.id,
  );
  TestValidator.predicate(
    "unavailable item has isAvailable set to false",
    unavailableCart.data[0].isAvailable === false,
  );
  // 6. Test all filter - should include all items regardless of availability
  const allCart: IPageIEcommerceMallCartItem.ISummary =
    await api.functional.ecommerceMall.customer.cart.index(customerConnection, {
      body: {
        cursor: null,
        limit: 10,
        product_id: null,
        variant_id: null,
        min_quantity: null,
        availability_status: "all",
        search: null,
      } satisfies IEcommerceMallCartItem.IRequest,
    });
  typia.assert(allCart);
  TestValidator.equals("all filter includes all items", allCart.data.length, 1);
  TestValidator.equals(
    "all filter item has correct variant id",
    allCart.data[0].productVariant.id,
    variant.id,
  );
}
