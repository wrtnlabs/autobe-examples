import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_sellers_me_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_products_images_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test product image upload with explicit order values.
 *
 * Validates that:
 * 1. Seller can upload images to their product with explicit order values
 * 2. Order values are stored exactly as provided (not auto-assigned)
 * 3. Each image has unique ID, correct URL, and valid timestamps
 * 4. Images are properly associated with the product
 */
export async function test_api_product_image_upload_with_explicit_order(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Create admin connection for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Admin creates a category required for product creation
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // Generate unique image URLs for each upload
  const imageUrl1 = typia.random<string & tags.Format<"uri">>();
  const imageUrl2 = typia.random<string & tags.Format<"uri">>();
  const imageUrl3 = typia.random<string & tags.Format<"uri">>();
  // Upload image with explicit order=3 (third in display sequence)
  const image1 =
    await api.functional.shoppingMall.seller.sellers.me.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          url: imageUrl1,
          order: 3,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image1);
  // Upload image with explicit order=1 (should become main/thumbnail - lowest order)
  const image2 =
    await api.functional.shoppingMall.seller.sellers.me.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          url: imageUrl2,
          order: 1,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image2);
  // Upload image with explicit order=2 (second in display sequence)
  const image3 =
    await api.functional.shoppingMall.seller.sellers.me.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          url: imageUrl3,
          order: 2,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image3);
  // Validate order values are stored exactly as provided
  TestValidator.equals("image 1 order is 3", image1.order, 3);
  TestValidator.equals("image 2 order is 1", image2.order, 1);
  TestValidator.equals("image 3 order is 2", image3.order, 2);
  // Validate URLs are stored correctly
  TestValidator.equals("image 1 URL matches", image1.url, imageUrl1);
  TestValidator.equals("image 2 URL matches", image2.url, imageUrl2);
  TestValidator.equals("image 3 URL matches", image3.url, imageUrl3);
  // Validate all images have unique IDs
  TestValidator.predicate(
    "all image IDs are unique",
    image1.id !== image2.id &&
      image2.id !== image3.id &&
      image1.id !== image3.id,
  );
}
