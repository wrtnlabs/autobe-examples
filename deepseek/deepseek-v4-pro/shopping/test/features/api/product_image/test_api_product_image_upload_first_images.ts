import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

export async function test_api_product_image_upload_first_images(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create product with no images
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  TestValidator.equals(
    "product starts with no images",
    product.images.length,
    0,
  );
  // 4. Upload first image — should get display_order 0 and become thumbnail
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image1);
  TestValidator.equals(
    "first image display_order is 0",
    image1.display_order,
    0,
  );
  TestValidator.equals(
    "first image created_at equals updated_at",
    image1.created_at,
    image1.updated_at,
  );
  TestValidator.equals(
    "first image becomes product thumbnail",
    image1.product.thumbnail_image_url,
    image1.image_url,
  );
  // 5. Upload second image — should get display_order 1
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image2);
  TestValidator.equals(
    "second image display_order is 1",
    image2.display_order,
    1,
  );
  TestValidator.equals(
    "second image created_at equals updated_at",
    image2.created_at,
    image2.updated_at,
  );
  TestValidator.notEquals(
    "image1 and image2 have different IDs",
    image1.id,
    image2.id,
  );
  // 6. Upload third image — should get display_order 2
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image3);
  TestValidator.equals(
    "third image display_order is 2",
    image3.display_order,
    2,
  );
  TestValidator.equals(
    "third image created_at equals updated_at",
    image3.created_at,
    image3.updated_at,
  );
  // 7. All images reference the same product
  TestValidator.equals(
    "image1 references correct product",
    image1.product.id,
    product.id,
  );
  TestValidator.equals(
    "image2 references correct product",
    image2.product.id,
    product.id,
  );
  TestValidator.equals(
    "image3 references correct product",
    image3.product.id,
    product.id,
  );
  // 8. Display order is sequential: 0, 1, 2
  TestValidator.equals(
    "display_order sequential from 0 to 1",
    image1.display_order + 1,
    image2.display_order,
  );
  TestValidator.equals(
    "display_order sequential from 1 to 2",
    image2.display_order + 1,
    image3.display_order,
  );
  // 9. Thumbnail remains the first image after additional uploads
  TestValidator.equals(
    "thumbnail unchanged after third upload",
    image3.product.thumbnail_image_url,
    image1.image_url,
  );
}
