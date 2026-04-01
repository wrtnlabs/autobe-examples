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
 * Test that a seller can successfully retrieve a specific product image from their own product.
 *
 * **Setup:**
 * 1. Register a new seller account
 * 2. Create a product with required fields (name, description, category_id, base_price)
 * 3. Upload an image to the product
 *
 * **Test Execution:**
 * 1. Call GET /shoppingMall/seller/products/{productId}/images/{imageId} with the created product and image IDs
 * 2. Verify the response returns the complete image entity
 *
 * **Validation Points:**
 * - Response contains complete IShoppingMallProductImage entity
 * - image_url matches the uploaded URL
 * - display_order is correctly assigned (0 for first image)
 * - created_at and updated_at timestamps are present and valid
 * - deleted_at is null (image is active)
 *
 * **Business Logic Verified:**
 * - Seller can access images from their own products
 * - Image metadata is correctly stored and retrieved
 * - Display order determines image position in gallery
 */
export async function test_api_product_image_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload an image to the product
  const imageUrl = typia.random<string & tags.Format<"uri">>();
  const uploadedImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: imageUrl,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(uploadedImage);
  // 4. Retrieve the specific product image
  const retrievedImage =
    await api.functional.shoppingMall.seller.products.images.at(
      sellerConnection,
      {
        productId: product.id,
        imageId: uploadedImage.id,
      },
    );
  typia.assert(retrievedImage);
  // 5. Validate the retrieved image
  TestValidator.equals("image ID matches", retrievedImage.id, uploadedImage.id);
  TestValidator.equals("image URL matches", retrievedImage.image_url, imageUrl);
  TestValidator.equals("display order is 0", retrievedImage.display_order, 0);
  TestValidator.predicate(
    "created_at is valid",
    retrievedImage.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrievedImage.updated_at !== null,
  );
  TestValidator.equals("deleted_at is null", retrievedImage.deleted_at, null);
}
