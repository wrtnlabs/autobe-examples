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

export async function test_api_product_image_upload_appended_to_existing_images(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Register a new admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. As admin, create a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. As seller, create a product with 2 initial images (A and B)
  const imageUrlA = typia.random<string & tags.Format<"url">>();
  const imageUrlB = typia.random<string & tags.Format<"url">>();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        images: [{ urls: [imageUrlA, imageUrlB] }],
      },
    },
  );
  typia.assert(product);
  // Record the pre-existing images sorted by sequence (ascending)
  const preExistingImages = [...product.images].sort(
    (a, b) => a.sequence - b.sequence,
  );
  TestValidator.predicate(
    "product starts with 2 images",
    preExistingImages.length === 2,
  );
  const thumbnailUrl = preExistingImages[0]!.url;
  const secondImageUrl = preExistingImages[1]!.url;
  // 5. As the seller, upload 2 additional images (C and D)
  const imageUrlC = typia.random<string & tags.Format<"url">>();
  const imageUrlD = typia.random<string & tags.Format<"url">>();
  const bundle =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          urls: [imageUrlC, imageUrlD],
        },
      },
    );
  typia.assert(bundle);
  // Validation 1: The images array must contain exactly 4 entries
  TestValidator.equals("total images count is 4", bundle.images.length, 4);
  // Validation 2: The images must be ordered by ascending sequence
  for (let i = 1; i < bundle.images.length; i++) {
    TestValidator.predicate(
      `sequence[${i}] > sequence[${i - 1}]`,
      bundle.images[i]!.sequence > bundle.images[i - 1]!.sequence,
    );
  }
  // Validation 3: All sequence values must be unique
  const sequences = bundle.images.map((img) => img.sequence);
  const uniqueSequences = new Set(sequences);
  TestValidator.equals("all sequences are unique", uniqueSequences.size, 4);
  // Validation 4: The first image (thumbnail) must still be image A
  TestValidator.equals(
    "thumbnail (first image) url unchanged",
    bundle.images[0]!.url,
    thumbnailUrl,
  );
  // Validation 5: The second image must still be image B
  TestValidator.equals(
    "second image url matches original B",
    bundle.images[1]!.url,
    secondImageUrl,
  );
  // Validation 6: The newly added image C must appear third
  TestValidator.equals(
    "third image url matches new image C",
    bundle.images[2]!.url,
    imageUrlC,
  );
  // Validation 7: The newly added image D must appear fourth
  TestValidator.equals(
    "fourth image url matches new image D",
    bundle.images[3]!.url,
    imageUrlD,
  );
}
