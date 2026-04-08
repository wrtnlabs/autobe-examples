import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test the primary success path for uploading the first product image that becomes the main thumbnail.
 *
 * Validates the complete product image upload workflow including administrative category setup, seller authentication, product creation, and image upload with display_order=0. Ensures that the first image correctly becomes the main thumbnail and that all system-generated fields are properly set.
 *
 * Special attention is given to verifying that the display_order is correctly set to 0, the image URL is stored and returned accurately, and the product relation contains complete product information including id, name, base_price, category, and seller details.
 *
 * 1. Administrator joins and creates a category for product organization.
 * 2. Seller joins the platform with unique credentials.
 * 3. Seller creates a product in the category with name, description, and base_price.
 * 4. Seller uploads the first product image with display_order=0 and valid image URL.
 * 5. Validates image response contains all required fields including auto-generated id and timestamps.
 * 6. Validates product relation in image response contains correct product information.
 * 7. Validates display_order is 0 making this the main thumbnail.
 */
export async function test_api_product_image_upload_first_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
      },
    },
  );
  typia.assert(category);
  // 2. Seller setup - join the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller uploads the first product image with display_order=0
  const imageUrl = typia.random<string & tags.Format<"uri">>();
  const image =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          url: imageUrl,
          display_order: 0,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image);
  // 5. Validate business logic - image properties
  TestValidator.equals("image url matches input", image.url, imageUrl);
  TestValidator.equals(
    "display_order is 0 (main thumbnail)",
    image.display_order,
    0,
  );
  // 6. Validate product relation in image response
  TestValidator.equals("product id matches", image.product.id, product.id);
  TestValidator.equals(
    "product name matches",
    image.product.name,
    product.name,
  );
  TestValidator.equals(
    "product base_price matches",
    image.product.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "product category id matches",
    image.product.category.id,
    category.id,
  );
  TestValidator.equals(
    "product category name matches",
    image.product.category.name,
    category.name,
  );
  TestValidator.predicate(
    "product has seller info",
    () => image.product.seller !== undefined,
  );
  TestValidator.predicate(
    "product inStock is boolean",
    () => typeof image.product.inStock === "boolean",
  );
}
