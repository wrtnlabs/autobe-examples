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

export async function test_api_product_variant_detail_owned_product_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          status: RandomGenerator.alphaNumeric(8),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const variantBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    option_summary: RandomGenerator.paragraph({ sentences: 3 }),
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
  const found =
    await api.functional.shoppingMall.seller.seller_products.variants.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(found);
  TestValidator.equals("variant id matches", found.id, variant.id);
  TestValidator.equals(
    "variant sku_code matches",
    found.sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "variant option_summary matches",
    found.option_summary,
    variant.option_summary,
  );
  TestValidator.equals(
    "variant price preserves null",
    found.price,
    variant.price,
  );
  TestValidator.equals(
    "variant created_at matches",
    found.created_at,
    variant.created_at,
  );
  TestValidator.equals(
    "variant updated_at matches",
    found.updated_at,
    variant.updated_at,
  );
  TestValidator.equals(
    "variant deleted_at matches",
    found.deleted_at,
    variant.deleted_at,
  );
  TestValidator.equals(
    "parent product id matches",
    found.product.id,
    product.id,
  );
  TestValidator.equals(
    "parent product name matches",
    found.product.name,
    product.name,
  );
  TestValidator.equals(
    "parent product description matches",
    found.product.description,
    product.description,
  );
  TestValidator.equals(
    "parent product base_price matches",
    found.product.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "parent product status matches",
    found.product.status,
    product.status,
  );
  TestValidator.equals(
    "parent product seller matches",
    found.product.seller,
    product.seller,
  );
  TestValidator.equals(
    "parent product category matches",
    found.product.category,
    product.category,
  );
  TestValidator.equals(
    "parent product created_at matches",
    found.product.created_at,
    product.created_at,
  );
  TestValidator.equals(
    "parent product updated_at matches",
    found.product.updated_at,
    product.updated_at,
  );
  TestValidator.equals(
    "parent product deleted_at matches",
    found.product.deleted_at,
    product.deleted_at,
  );
}
