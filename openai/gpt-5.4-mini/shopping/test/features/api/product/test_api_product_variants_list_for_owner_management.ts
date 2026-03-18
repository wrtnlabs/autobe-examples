import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variants_list_for_owner_management(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IShoppingMallSeller.IJoin,
  });
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(product);
  const createdVariants = await ArrayUtil.asyncMap(
    [
      {
        skuCode: `SKU-${RandomGenerator.alphabets(6)}-A`,
        overridePrice: null,
        stockQuantity: 7,
      },
      {
        skuCode: `SKU-${RandomGenerator.alphabets(6)}-B`,
        overridePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
        stockQuantity: 0,
      },
      {
        skuCode: `SKU-${RandomGenerator.alphabets(6)}-C`,
        overridePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
        stockQuantity: 3,
      },
    ] as const,
    async (body) => {
      const created =
        await generate_random_shopping_mall_seller_products_variants_create(
          sellerConnection,
          {
            params: { productId: product.id },
            body,
          },
        );
      typia.assert(created);
      return created;
    },
  );
  const listed = await api.functional.shoppingMall.products.variants.index(
    sellerConnection,
    {
      productId: product.id,
      body: {
        deletedState: "active",
        sort: "newest",
        page: 1,
        limit: 100,
      } satisfies IShoppingMallProductVariant.IRequest,
    },
  );
  typia.assert(listed);
  TestValidator.equals(
    "variant count should match created variants",
    listed.data.length,
    createdVariants.length,
  );
  TestValidator.equals(
    "pagination current should be first page",
    listed.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    listed.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination records should match created variants",
    listed.pagination.records,
    createdVariants.length,
  );
  TestValidator.equals(
    "pagination pages should be one for a small result set",
    listed.pagination.pages,
    1,
  );
  TestValidator.equals(
    "listed sku codes should match created sku codes",
    listed.data.map((item) => item.skuCode).sort(),
    createdVariants.map((item) => item.skuCode).sort(),
  );
  TestValidator.predicate(
    "out of stock variant should be visible in owner management list",
    listed.data.some((item) => item.stockQuantity === 0),
  );
  TestValidator.predicate(
    "in stock variant should be visible in owner management list",
    listed.data.some((item) => item.stockQuantity > 0),
  );
  TestValidator.predicate(
    "default newest ordering should place the latest created variant first",
    listed.data.length < 2 ||
      listed.data[0].createdAt >= listed.data[1].createdAt,
  );
}
