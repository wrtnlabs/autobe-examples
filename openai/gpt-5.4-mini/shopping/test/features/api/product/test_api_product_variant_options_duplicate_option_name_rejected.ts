import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantOption";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_product_variant_options_duplicate_option_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
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
  const variant = product.variants[0];
  if (variant === undefined) {
    throw new Error(
      "Test precondition failed: created product must contain at least one variant to validate variant option updates.",
    );
  }
  const originalOptions =
    await api.functional.shoppingMall.products.variants.options.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          options: [
            {
              option_name: "color",
              option_value: "red",
            } satisfies IShoppingMallProductVariantOption.ICreate,
            {
              option_name: "size",
              option_value: "large",
            } satisfies IShoppingMallProductVariantOption.ICreate,
          ],
        } satisfies IShoppingMallProductVariantOption.IRequest,
      },
    );
  typia.assert(originalOptions);
  await TestValidator.error(
    "duplicate option names in a single update payload should be rejected",
    async () => {
      await api.functional.shoppingMall.products.variants.options.index(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
          body: {
            options: [
              {
                option_name: "color",
                option_value: "red",
              } satisfies IShoppingMallProductVariantOption.ICreate,
              {
                option_name: "color",
                option_value: "blue",
              } satisfies IShoppingMallProductVariantOption.ICreate,
            ],
          } satisfies IShoppingMallProductVariantOption.IRequest,
        },
      );
    },
  );
  const afterOptions =
    await api.functional.shoppingMall.products.variants.options.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          options: [
            {
              option_name: "color",
              option_value: "red",
            } satisfies IShoppingMallProductVariantOption.ICreate,
            {
              option_name: "size",
              option_value: "large",
            } satisfies IShoppingMallProductVariantOption.ICreate,
          ],
        } satisfies IShoppingMallProductVariantOption.IRequest,
      },
    );
  typia.assert(afterOptions);
  TestValidator.equals(
    "duplicate-name rejection should preserve the previously stored option rows",
    afterOptions.data.map((item) => ({
      optionName: item.optionName,
      optionValue: item.optionValue,
    })),
    originalOptions.data.map((item) => ({
      optionName: item.optionName,
      optionValue: item.optionValue,
    })),
  );
}
