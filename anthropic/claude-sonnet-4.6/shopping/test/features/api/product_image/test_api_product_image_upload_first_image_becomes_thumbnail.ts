import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_image_upload_first_image_becomes_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Admin creates a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_id: null,
        name: "Test Category " + RandomGenerator.alphaNumeric(6),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // 4. Seller creates a product with NO initial images
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product " + RandomGenerator.alphaNumeric(6),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 9999,
        categoryId: category.id,
        images: [],
        variants: [],
      },
    },
  );
  typia.assert(product);
  // 5. Prepare 3 image URLs
  const imageUrls: (string & tags.Format<"url">)[] = [
    "https://cdn.example.com/images/product-1.jpg" as string &
      tags.Format<"url">,
    "https://cdn.example.com/images/product-2.jpg" as string &
      tags.Format<"url">,
    "https://cdn.example.com/images/product-3.jpg" as string &
      tags.Format<"url">,
  ];
  // 6. Seller uploads 3 images to the product (which currently has no images)
  const bundle =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          urls: imageUrls,
        },
      },
    );
  typia.assert(bundle);
  // 7. Validate: exactly 3 images in the bundle
  TestValidator.equals("image count is 3", bundle.images.length, 3);
  // 8. Validate: images are ordered by ascending sequence
  const sequences = bundle.images.map((img) => img.sequence);
  for (let i = 1; i < sequences.length; i++) {
    TestValidator.predicate(
      `sequence[${i}] > sequence[${i - 1}] (ascending order)`,
      sequences[i]! > sequences[i - 1]!,
    );
  }
  // 9. Validate: first image (lowest sequence) matches the first URL (thumbnail)
  TestValidator.equals(
    "first image URL matches first submitted URL (thumbnail)",
    bundle.images[0]!.url,
    imageUrls[0]!,
  );
  // 10. Validate: second and third image URLs match submitted order
  TestValidator.equals(
    "second image URL matches second submitted URL",
    bundle.images[1]!.url,
    imageUrls[1]!,
  );
  TestValidator.equals(
    "third image URL matches third submitted URL",
    bundle.images[2]!.url,
    imageUrls[2]!,
  );
  // 11. Validate each image has correct product ID and non-negative sequence
  for (const img of bundle.images) {
    TestValidator.equals(
      "image belongs to the created product",
      img.shopping_mall_product_id,
      product.id,
    );
    TestValidator.predicate(
      "image sequence is non-negative",
      img.sequence >= 0,
    );
  }
}
