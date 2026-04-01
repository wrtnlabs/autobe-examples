import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test product image URL replacement workflow.
 *
 * This test validates the complete flow of replacing a product image:
 * 1. Seller registers and authenticates
 * 2. Seller creates a product
 * 3. Seller uploads an initial product image
 * 4. Seller updates the image URL to replace the image file
 * 5. Verify the updated image has the new URL and refreshed timestamp
 * 6. Verify display_order is preserved during the update
 */
export async function test_api_product_image_url_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product to attach images to
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload initial product image
  const initialImageUrl = typia.random<string & tags.Format<"uri">>();
  const initialImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: initialImageUrl,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(initialImage);
  // Verify initial image properties
  TestValidator.equals(
    "initial image URL",
    initialImage.image_url,
    initialImageUrl,
  );
  TestValidator.equals("initial display order", initialImage.display_order, 0);
  const initialUpdatedAt = initialImage.updated_at;
  // 4. Update the image URL (simulate replacing the image file)
  const newImageUrl = typia.random<string & tags.Format<"uri">>();
  const updatedImage =
    await api.functional.shoppingMall.seller.products.images.putByProductidAndImageid(
      sellerConnection,
      {
        productId: product.id,
        imageId: initialImage.id,
        body: {
          image_url: newImageUrl,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // 5. Validate the updated image
  TestValidator.equals(
    "updated image URL",
    updatedImage.image_url,
    newImageUrl,
  );
  TestValidator.equals(
    "display order preserved",
    updatedImage.display_order,
    initialImage.display_order,
  );
  TestValidator.notEquals(
    "timestamp refreshed",
    updatedImage.updated_at,
    initialUpdatedAt,
  );
  TestValidator.equals("image ID unchanged", updatedImage.id, initialImage.id);
}
