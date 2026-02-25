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

export async function test_api_seller_product_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url:
          Math.random() > 0.5
            ? null
            : typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(joinResponse);
  // Re-authenticate with the token from join response
  sellerConnection.headers = {
    Authorization: joinResponse.token.access,
  };
  // Step 2: Create a product with initial data
  const initialCategory = typia.random<IShoppingMallCategory.ISummary>();
  const initialProduct =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: initialCategory.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        images: ArrayUtil.repeat(
          3,
          () =>
            ({
              image_url: typia.random<string & tags.Format<"uri">>(),
              sort_order: Math.floor(Math.random() * 10),
            }) satisfies IShoppingMallProductImage.ICreate,
        ),
        variants: ArrayUtil.repeat(
          2,
          () =>
            ({
              sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
              option_values: [
                {
                  option_name: "color",
                  option_value: RandomGenerator.pick(["red", "blue", "green"]),
                },
                {
                  option_name: "size",
                  option_value: RandomGenerator.pick(["S", "M", "L"]),
                },
              ] satisfies IShoppingMallProductVariantOptionValue.ICreate[],
              price_override: null,
              stock_quantity: 100,
            }) satisfies IShoppingMallProductVariant.ICreate,
        ),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(initialProduct);
  // Step 3: Update the product
  const updatedCategory = typia.random<IShoppingMallCategory.ISummary>();
  const updateData: IShoppingMallProduct.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    shopping_mall_category_id: updatedCategory.id,
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    product_images: [
      { image_id: initialProduct.images[1].id, sort_order: 0 },
      { image_id: initialProduct.images[0].id, sort_order: 1 },
      { image_id: initialProduct.images[2].id, sort_order: 2 },
    ],
  };
  const updatedProduct =
    await api.functional.shoppingMall.seller.sellers.products.update(
      sellerConnection,
      {
        productId: initialProduct.id,
        body: updateData,
      },
    );
  typia.assert(updatedProduct);
  // Step 4: Validate the update
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    updateData.name,
  );
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    updateData.description,
  );
  TestValidator.equals(
    "product category updated",
    updatedProduct.category.id,
    updateData.shopping_mall_category_id,
  );
  TestValidator.equals(
    "product base_price updated",
    updatedProduct.base_price,
    updateData.base_price,
  );
  TestValidator.equals(
    "product images reordered",
    updatedProduct.images.length,
    3,
  );
  TestValidator.equals(
    "first image reordered",
    updatedProduct.images[0].id,
    initialProduct.images[1].id,
  );
  TestValidator.equals(
    "second image reordered",
    updatedProduct.images[1].id,
    initialProduct.images[0].id,
  );
  TestValidator.equals(
    "third image reordered",
    updatedProduct.images[2].id,
    initialProduct.images[2].id,
  );
}
