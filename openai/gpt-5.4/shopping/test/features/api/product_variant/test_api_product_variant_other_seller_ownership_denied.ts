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

export async function test_api_product_variant_other_seller_ownership_denied(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnectionA: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerConnectionA, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerA);
  const parentProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnectionA,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >() satisfies number,
          status: RandomGenerator.pick(["draft", "active"] as const),
        },
      },
    );
  typia.assert(parentProduct);
  const originalProductId = parentProduct.id;
  const originalSellerId = parentProduct.seller.id;
  const originalName = parentProduct.name;
  const originalDescription = parentProduct.description;
  const originalBasePrice = parentProduct.base_price;
  const originalStatus = parentProduct.status;
  const originalVariantCount = parentProduct.variants.length;
  const originalImageCount = parentProduct.images.length;
  const originalCategory = parentProduct.category;
  const sellerConnectionB: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerConnectionB, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerB);
  const forbiddenBody = {
    sku_code: `foreign-${RandomGenerator.alphaNumeric(8)}`,
    option_summary: RandomGenerator.paragraph({ sentences: 3 }),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1>
    >() satisfies number,
  } satisfies IShoppingMallProductVariant.ICreate;
  await TestValidator.error(
    "other seller cannot create variant for foreign product",
    async () => {
      await generate_random_shopping_mall_seller_seller_products_variants_create(
        sellerConnectionB,
        {
          params: {
            productId: parentProduct.id,
          },
          body: forbiddenBody,
        },
      );
    },
  );
  TestValidator.equals(
    "product id unchanged",
    parentProduct.id,
    originalProductId,
  );
  TestValidator.equals(
    "product owner unchanged",
    parentProduct.seller.id,
    originalSellerId,
  );
  TestValidator.equals(
    "product name unchanged",
    parentProduct.name,
    originalName,
  );
  TestValidator.equals(
    "product description unchanged",
    parentProduct.description,
    originalDescription,
  );
  TestValidator.equals(
    "product base price unchanged",
    parentProduct.base_price,
    originalBasePrice,
  );
  TestValidator.equals(
    "product status unchanged",
    parentProduct.status,
    originalStatus,
  );
  TestValidator.equals(
    "variant count unchanged",
    parentProduct.variants.length,
    originalVariantCount,
  );
  TestValidator.equals(
    "image count unchanged",
    parentProduct.images.length,
    originalImageCount,
  );
  TestValidator.equals(
    "category unchanged",
    parentProduct.category,
    originalCategory,
  );
  TestValidator.equals(
    "product remains owned by seller A",
    parentProduct.seller.id,
    sellerA.id,
  );
  TestValidator.notEquals(
    "forbidden actor differs from owner",
    sellerB.id,
    parentProduct.seller.id,
  );
}
