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

export async function test_api_product_variant_duplicate_sku_conflict(
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
    },
  });
  typia.assert(seller);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 10000,
          status: "active",
        },
      },
    );
  typia.assert(product);
  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const firstVariantBody = {
    sku_code: skuCode,
    option_summary: `Color ${RandomGenerator.alphabets(5)} / Size M`,
    price: 12000,
  } satisfies IShoppingMallProductVariant.ICreate;
  const duplicateVariantBody = {
    sku_code: skuCode,
    option_summary: `Color ${RandomGenerator.alphabets(5)} / Size L`,
    price: 13000,
  } satisfies IShoppingMallProductVariant.ICreate;
  const firstVariant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: firstVariantBody,
      },
    );
  typia.assert(firstVariant);
  await TestValidator.error(
    "duplicate sku_code in same product is rejected",
    async () => {
      await generate_random_shopping_mall_seller_seller_products_variants_create(
        sellerConnection,
        {
          params: {
            productId: product.id,
          },
          body: duplicateVariantBody,
        },
      );
    },
  );
  TestValidator.notEquals(
    "duplicate attempt changes non-key business fields",
    firstVariantBody.option_summary,
    duplicateVariantBody.option_summary,
  );
  TestValidator.notEquals(
    "duplicate attempt changes price",
    firstVariantBody.price ?? null,
    duplicateVariantBody.price ?? null,
  );
  TestValidator.equals(
    "variant belongs to product",
    firstVariant.product.id,
    product.id,
  );
  TestValidator.equals(
    "original sku_code remains",
    firstVariant.sku_code,
    firstVariantBody.sku_code,
  );
  TestValidator.equals(
    "original option_summary remains unchanged",
    firstVariant.option_summary,
    firstVariantBody.option_summary,
  );
  TestValidator.equals(
    "original price remains unchanged",
    firstVariant.price,
    firstVariantBody.price ?? null,
  );
  TestValidator.predicate(
    "original variant remains active",
    firstVariant.deleted_at === null,
  );
}
