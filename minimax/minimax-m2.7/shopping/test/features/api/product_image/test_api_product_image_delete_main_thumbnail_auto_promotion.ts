import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_images_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_product_image_delete_main_thumbnail_auto_promotion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a category for the product
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Register seller (starts with pending status)
  // Note: Seller approval API is not available in this SDK
  // For this test, we use the seller's pending status session from join
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthResult = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerAuthResult);
  // 4. Create a product with the category
  // Note: Pending sellers may not be able to create products (403 Forbidden expected)
  // This test validates the image deletion API regardless of seller approval status
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
        } satisfies DeepPartial<IEcommerceMallProduct.ICreate>,
      },
    );
  typia.assert(product);
  // 5. Upload first image - becomes main thumbnail (display_order=0)
  const firstImage =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(firstImage);
  TestValidator.equals(
    "first image should be main thumbnail",
    firstImage.displayOrder,
    0,
  );
  // 6. Upload second image - gets display_order=1
  const secondImage =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(secondImage);
  TestValidator.equals(
    "second image should have display_order 1",
    secondImage.displayOrder,
    1,
  );
  // 7. Delete the main thumbnail image (display_order=0)
  const mainImageId = firstImage.id;
  await api.functional.ecommerceMall.seller.sellers.me.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: mainImageId,
    },
  );
  // 8. Upload a third image to verify the previous second image was promoted
  // If the second image was promoted to display_order=0, the new image should get display_order=1
  const thirdImage =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(thirdImage);
  // The third image should have display_order=1, proving:
  // 1. The deletion was successful (we can add a new image)
  // 2. The second image was promoted to display_order=0
  // 3. The new image correctly got the next available order (1)
  TestValidator.equals(
    "third image should have display_order 1",
    thirdImage.displayOrder,
    1,
  );
  // Additionally, verify the third image's ID matches the second image (which was promoted)
  TestValidator.equals(
    "third image ID should be the second image's ID (promoted to main)",
    thirdImage.id,
    secondImage.id,
  );
  TestValidator.equals(
    "third image should now be the main thumbnail",
    thirdImage.displayOrder,
    0,
  );
}
