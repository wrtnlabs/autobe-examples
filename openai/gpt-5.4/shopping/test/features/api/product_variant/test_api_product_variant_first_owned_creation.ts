import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_first_owned_creation(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  const productBody = {
    shopping_mall_category_id: null,
    name: `product-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.content({ paragraphs: 2 }),
    base_price: 15000,
    status: `status-${RandomGenerator.alphabets(6)}`,
  } satisfies IShoppingMallProduct.ICreate;
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: productBody,
      },
    );
  typia.assert(product);
  TestValidator.equals(
    "product owner matches seller",
    product.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "product starts without variants",
    product.variants.length,
    0,
  );
  TestValidator.equals("product category is null", product.category, null);
  TestValidator.equals(
    "product base price matches input",
    product.base_price,
    productBody.base_price,
  );
  TestValidator.equals(
    "product status matches input",
    product.status,
    productBody.status,
  );
  const variantBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(12)}`,
    option_summary: `Color ${RandomGenerator.alphabets(5)} / Size ${RandomGenerator.alphabets(3)}`,
    price: null,
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: variantBody,
      },
    );
  typia.assert(variant);
  TestValidator.notEquals(
    "variant id differs from product id",
    variant.id,
    product.id,
  );
  TestValidator.equals(
    "variant belongs to product",
    variant.product.id,
    product.id,
  );
  TestValidator.equals(
    "variant product name matches",
    variant.product.name,
    product.name,
  );
  TestValidator.equals(
    "variant product description matches",
    variant.product.description,
    product.description,
  );
  TestValidator.equals(
    "variant product base price matches",
    variant.product.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "variant product status matches",
    variant.product.status,
    product.status,
  );
  TestValidator.equals(
    "variant product seller matches",
    variant.product.seller,
    product.seller,
  );
  TestValidator.equals(
    "variant product category matches",
    variant.product.category,
    product.category,
  );
  TestValidator.equals(
    "variant sku code matches input",
    variant.sku_code,
    variantBody.sku_code,
  );
  TestValidator.equals(
    "variant option summary matches input",
    variant.option_summary,
    variantBody.option_summary,
  );
  TestValidator.equals("variant price remains null", variant.price, null);
  TestValidator.equals("variant is active", variant.deleted_at, null);
  TestValidator.predicate(
    "variant created_at exists",
    variant.created_at.length > 0,
  );
  TestValidator.predicate(
    "variant updated_at exists",
    variant.updated_at.length > 0,
  );
  TestValidator.equals(
    "newly created variant timestamps are synchronized",
    variant.updated_at,
    variant.created_at,
  );
  TestValidator.predicate(
    "first variant creation establishes an active purchasable option",
    product.variants.length === 0 &&
      variant.deleted_at === null &&
      variant.product.id === product.id,
  );
}
