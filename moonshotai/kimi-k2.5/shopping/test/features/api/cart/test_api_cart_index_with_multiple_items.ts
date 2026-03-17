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

export async function test_api_cart_index_with_multiple_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - Create seller connection and register
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create two variants for the product
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant2);
  // 4. Add inventory to both variants
  await generate_random_ecommerce_mall_seller_variants_inventory_create(
    sellerConnection,
    {
      params: { variantId: variant1.id },
      body: {
        quantity: 10,
        reason: "Initial stock for testing",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  await generate_random_ecommerce_mall_seller_variants_inventory_create(
    sellerConnection,
    {
      params: { variantId: variant2.id },
      body: {
        quantity: 15,
        reason: "Initial stock for testing",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  // 5. Customer setup - Create customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 6. Add both variants to cart
  const cartItem1 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant1.id,
          quantity: 2,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant2.id,
          quantity: 3,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 7. Query cart with pagination
  const cartResponse = await api.functional.ecommerceMall.customer.cart.index(
    customerConnection,
    {
      body: {
        cursor: null,
        limit: 10,
        product_id: null,
        variant_id: null,
        min_quantity: null,
        availability_status: "all",
        search: null,
      } satisfies IEcommerceMallCartItem.IRequest,
    },
  );
  typia.assert(cartResponse);
  // 8. Validate cart contents
  TestValidator.equals(
    "cart data has correct length",
    cartResponse.data.length,
    2,
  );
  TestValidator.predicate(
    "cart has pagination metadata",
    () =>
      cartResponse.pagination !== undefined && cartResponse.pagination !== null,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    () => cartResponse.pagination.current >= 0,
  );
  TestValidator.predicate("cart items contain variant details", () =>
    cartResponse.data.every(
      (item) =>
        item.productVariant !== undefined &&
        item.productVariant.options !== undefined &&
        item.productVariant.currentStock !== undefined,
    ),
  );
  TestValidator.predicate("cart items have calculated subtotals", () =>
    cartResponse.data.every(
      (item) => item.subtotal !== undefined && item.subtotal > 0,
    ),
  );
  TestValidator.predicate("cart items have availability computed", () =>
    cartResponse.data.every((item) => typeof item.isAvailable === "boolean"),
  );
}
