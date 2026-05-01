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

/**
 * Test appending additional images to a product's existing image gallery.
 *
 * Validates that newly uploaded images are appended after the existing gallery with sequential display_order values. The test first uploads two baseline images establishing positions 0 and 1, then uploads two more images and verifies they receive positions 2 and 3 — confirming the append behavior rather than insertion or replacement.
 *
 * Also verifies that each upload returns only the newly created image record with a unique ID distinct from all baseline images, and that the response does not include pre-existing gallery images.
 *
 * 1. Administrator joins and creates a product category.
 * 2. Seller joins and creates a product under the category.
 * 3. Seller uploads two baseline images — verified at display_order 0 and 1.
 * 4. Seller uploads two additional images — verified at display_order 2 and 3.
 * 5. Confirms appended images have unique IDs distinct from baseline images.
 */
export async function test_api_product_image_upload_append_to_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup — create category for product
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup — register and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 3. Upload baseline images to establish gallery
  const baseline1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(baseline1);
  TestValidator.equals(
    "first baseline image at display_order 0",
    baseline1.display_order,
    0,
  );
  const baseline2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(baseline2);
  TestValidator.equals(
    "second baseline image at display_order 1",
    baseline2.display_order,
    1,
  );
  // 4. Append additional images — verify sequential continuation
  const appended1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(appended1);
  TestValidator.equals(
    "first appended image at display_order 2",
    appended1.display_order,
    2,
  );
  const appended2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(appended2);
  TestValidator.equals(
    "second appended image at display_order 3",
    appended2.display_order,
    3,
  );
  // 5. Verify appended images are distinct records from baseline
  TestValidator.notEquals(
    "appended image 1 has unique ID from baseline 1",
    appended1.id,
    baseline1.id,
  );
  TestValidator.notEquals(
    "appended image 1 has unique ID from baseline 2",
    appended1.id,
    baseline2.id,
  );
  TestValidator.notEquals(
    "appended image 2 has unique ID from baseline 1",
    appended2.id,
    baseline1.id,
  );
  TestValidator.notEquals(
    "appended image 2 has unique ID from baseline 2",
    appended2.id,
    baseline2.id,
  );
}
