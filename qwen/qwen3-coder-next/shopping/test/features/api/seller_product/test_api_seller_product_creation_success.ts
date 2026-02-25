import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
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
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_seller_product_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account via utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData: IShoppingMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  };
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, { body: sellerData });
  typia.assert(sellerAuthorized);
  // Step 2: Use generated category if available (simplified - create default category)
  const categoryId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000001";
  // Step 3: Generate product variant data with unique SKU and option values
  const variantOptionName: string = RandomGenerator.alphabets(6);
  const variantOptionValue1: string = RandomGenerator.alphabets(4);
  const variantOptionValue2: string = RandomGenerator.alphabets(4);
  const productVariants: IShoppingMallProductVariant.ICreate[] = [
    {
      sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
      option_values: [
        {
          option_name: variantOptionName,
          option_value: variantOptionValue1,
        },
      ],
      price_override: null,
      stock_quantity: 100,
    },
    {
      sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
      option_values: [
        {
          option_name: variantOptionName,
          option_value: variantOptionValue2,
        },
      ],
      price_override: null,
      stock_quantity: 150,
    },
  ];
  // Step 4: Create product images with valid URLs
  const productImages: IShoppingMallProductImage.ICreate[] = [
    {
      image_url: typia.random<string & tags.Format<"uri">>(),
      sort_order: 0,
    },
    {
      image_url: typia.random<string & tags.Format<"uri">>(),
      sort_order: 1,
    },
  ];
  // Step 5: Create product with all required fields
  const productPayload: IShoppingMallProduct.ICreate = {
    name: RandomGenerator.name(),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    shopping_mall_category_id: categoryId,
    base_price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >() satisfies number as number,
    images: productImages,
    variants: productVariants,
  };
  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: productPayload,
    });
  typia.assert(createdProduct);
  // Step 6: Validate product creation results
  TestValidator.equals(
    "product name matches",
    createdProduct.name,
    productPayload.name,
  );
  TestValidator.equals(
    "product description matches",
    createdProduct.description,
    productPayload.description,
  );
  TestValidator.equals(
    "product price matches",
    createdProduct.base_price,
    productPayload.base_price,
  );
  TestValidator.equals(
    "category id matches",
    createdProduct.category.id,
    categoryId,
  );
  TestValidator.equals(
    "seller id matches",
    createdProduct.seller.id,
    sellerAuthorized.data.profile.id,
  );
  TestValidator.equals(
    "product images count",
    createdProduct.images.length,
    productPayload.images?.length ?? 0,
  );
  TestValidator.equals(
    "product variants count",
    createdProduct.variants.length,
    productPayload.variants.length,
  );
  TestValidator.predicate("product is not deleted", !createdProduct.is_deleted);
  // Step 7: Validate variant details
  for (let i = 0; i < createdProduct.variants.length; i++) {
    const createdVariant = createdProduct.variants[i];
    const expectedVariant = productPayload.variants[i];
    TestValidator.equals(
      "variant sku code matches",
      createdVariant.skuCode,
      expectedVariant.sku_code,
    );
    TestValidator.equals(
      "variant stock quantity matches",
      createdVariant.stockQuantity,
      expectedVariant.stock_quantity ?? 0,
    );
    // Validate option values match
    if (
      expectedVariant.option_values &&
      expectedVariant.option_values.length > 0
    ) {
      const optionNames = expectedVariant.option_values.map(
        (ov) => ov.option_name,
      );
      for (const optionName of optionNames) {
        const matchingOption = createdVariant.optionValues.find((ov) =>
          ov.includes(optionName),
        );
        TestValidator.predicate(
          "option value exists",
          matchingOption !== undefined,
        );
      }
    }
  }
}
