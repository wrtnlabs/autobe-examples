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

export async function test_api_product_update_images_reorder(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 3 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Update connection with seller's token
  sellerConnection.headers = { Authorization: seller.token.access };
  // 2. Get a category for product
  const categories: IShoppingMallCategory.ISummary[] = [
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: "Electronics",
      description: null,
      parent: null,
      subcategory_count: 0,
    },
  ];
  const categoryId = categories[0].id;
  // 3. Create product with multiple images
  const productImages: IShoppingMallProductImage.ICreate[] = [
    {
      image_url: typia.random<string & tags.Format<"uri">>(),
      sort_order: 0,
    },
    {
      image_url: typia.random<string & tags.Format<"uri">>(),
      sort_order: 1,
    },
    {
      image_url: typia.random<string & tags.Format<"uri">>(),
      sort_order: 2,
    },
  ];
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.MultipleOf<0.01>
        >(),
        images: productImages,
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            option_values: [
              {
                option_name: "color",
                option_value: "black",
              },
            ],
            stock_quantity: 100,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);
  // 4. Verify initial image order
  TestValidator.equals("initial image count", product.images.length, 3);
  TestValidator.equals(
    "initial first image order",
    product.images[0].sort_order,
    0,
  );
  TestValidator.equals(
    "initial second image order",
    product.images[1].sort_order,
    1,
  );
  TestValidator.equals(
    "initial third image order",
    product.images[2].sort_order,
    2,
  );
  // 5. Reorder product images
  const reorderedImages: IShoppingMallProductImage.IUpdate[] = [
    {
      image_id: product.images[2].id,
      sort_order: 0,
    },
    {
      image_id: product.images[0].id,
      sort_order: 1,
    },
    {
      image_id: product.images[1].id,
      sort_order: 2,
    },
  ];
  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        product_images: reorderedImages,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 6. Verify reordered images
  TestValidator.equals(
    "reordered image count",
    updatedProduct.images.length,
    3,
  );
  TestValidator.equals(
    "first image is now third",
    updatedProduct.images[0].id,
    product.images[2].id,
  );
  TestValidator.equals(
    "first image sort order",
    updatedProduct.images[0].sort_order,
    0,
  );
  TestValidator.equals(
    "second image is now first",
    updatedProduct.images[1].id,
    product.images[0].id,
  );
  TestValidator.equals(
    "second image sort order",
    updatedProduct.images[1].sort_order,
    1,
  );
  TestValidator.equals(
    "third image is now second",
    updatedProduct.images[2].id,
    product.images[1].id,
  );
  TestValidator.equals(
    "third image sort order",
    updatedProduct.images[2].sort_order,
    2,
  );
}
