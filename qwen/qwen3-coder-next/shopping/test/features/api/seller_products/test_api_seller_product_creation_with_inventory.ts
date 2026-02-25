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

export async function test_api_seller_product_creation_with_inventory(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResult);
  typia.assert(joinResult.token);
  // Create new connection with authenticated token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joinResult.token.access,
    },
  };
  // 2. Create product with multiple variants
  const productName = RandomGenerator.name(3);
  const productDescription = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });
  // Create variants with different stock quantities and option combinations
  const variants = ArrayUtil.repeat(
    3,
    (index) =>
      ({
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}-${index}`,
        option_values: [
          {
            option_name: "color",
            option_value: ["red", "blue", "green"][index] as string,
          },
          {
            option_name: "size",
            option_value: ["S", "M", "L"][index] as string,
          },
        ] satisfies IShoppingMallProductVariantOptionValue.ICreate[],
        stock_quantity: (index + 1) * 10,
      }) satisfies IShoppingMallProductVariant.ICreate,
  );
  const product = await api.functional.shoppingMall.seller.products.create(
    authenticatedSellerConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        base_price: 19999,
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        images: [
          {
            image_url: RandomGenerator.alphaNumeric(32) + ".jpg",
            sort_order: 0,
          },
        ] satisfies IShoppingMallProductImage.ICreate[],
        variants: variants,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Verify product creation
  TestValidator.equals("product name matches", product.name, productName);
  TestValidator.equals(
    "product description matches",
    product.description,
    productDescription,
  );
  TestValidator.equals("product has 3 variants", product.variants.length, 3);
  TestValidator.equals("product has 1 image", product.images.length, 1);
  // 4. Verify variants and their stock quantities
  product.variants.forEach((variant, index) => {
    TestValidator.equals(
      `variant ${index} sku code is unique`,
      typeof variant.skuCode,
      "string",
    );
    TestValidator.equals(
      `variant ${index} has stock quantity`,
      variant.stockQuantity,
      (index + 1) * 10,
    );
    TestValidator.equals(
      `variant ${index} has 2 option values`,
      variant.optionValues.length,
      2,
    );
    TestValidator.predicate(
      `variant ${index} option values are correct`,
      () =>
        variant.optionValues.includes("red") ||
        variant.optionValues.includes("blue") ||
        variant.optionValues.includes("green"),
    );
    TestValidator.equals(
      `variant ${index} product ID matches`,
      variant.shoppingMallProductId,
      product.id,
    );
    TestValidator.equals(
      `variant ${index} seller ID matches`,
      variant.product.seller.id,
      joinResult.data.profile.id,
    );
  });
  // 5. Verify seller relationship
  TestValidator.equals(
    "product seller matches authenticated seller",
    product.seller.id,
    joinResult.data.profile.id,
  );
  TestValidator.equals(
    "product seller shop name matches",
    product.seller.shop_name,
    joinResult.data.profile.shop_name,
  );
  // 6. Verify category relationship
  TestValidator.equals(
    "product category has ID",
    typeof product.category.id,
    "string",
  );
  TestValidator.equals(
    "product category has name",
    typeof product.category.name,
    "string",
  );
  // 7. Test SKU uniqueness constraint by attempting duplicate
  await TestValidator.error("duplicate SKU should fail", async () => {
    await api.functional.shoppingMall.seller.products.create(
      authenticatedSellerConnection,
      {
        body: {
          name: productName + " Duplicate",
          description: productDescription + " Duplicate",
          base_price: 29999,
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          variants: [
            {
              sku_code: variants[0].sku_code, // Use same SKU as first variant
              option_values: [
                {
                  option_name: "color",
                  option_value: "black",
                },
                {
                  option_name: "size",
                  option_value: "XL",
                },
              ] satisfies IShoppingMallProductVariantOptionValue.ICreate[],
              stock_quantity: 5,
            },
          ] satisfies IShoppingMallProductVariant.ICreate[],
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  });
  // 8. Verify image format
  TestValidator.predicate("product image URL ends with .jpg", () =>
    product.images[0].image_url.endsWith(".jpg"),
  );
  TestValidator.equals(
    "product image sort order is 0",
    product.images[0].sort_order,
    0,
  );
}
