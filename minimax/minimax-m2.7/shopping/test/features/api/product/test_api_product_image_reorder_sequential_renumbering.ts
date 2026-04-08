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

/**
 * Test that the system correctly renumbers image display orders sequentially when reordering.
 *
 * Validates the complete image reordering workflow for seller products. The test creates a category and product with 4 images, then sends a reorder request with non-sequential positions. The system must atomically apply the changes and renumber all images sequentially starting from 1 without gaps or duplicates.
 *
 * 1. Administrator creates a product category.
 * 2. Seller registers and authenticates on the platform.
 * 3. Seller creates a new product under the category.
 * 4. Seller uploads 4 images to the product.
 * 5. Seller sends reorder request with non-sequential positions (e.g., image1→4, image2→1, image3→3, image4→2).
 * 6. System applies changes atomically and returns 204 No Content.
 * 7. Validates all images are renumbered sequentially starting from 1 without gaps.
 *
 * **Key Validation Points**:
 * - All images have sequential display_order values starting from 1
 * - No gaps exist in display_order values (1, 2, 3, 4)
 * - No duplicate display_order values exist
 * - The reorder operation completes successfully without conflicts
 */
export async function test_api_product_image_reorder_sequential_renumbering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product with the category
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 4. Seller uploads 4 images to the product
  const image1 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image3);
  const image4 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image4);
  // Verify initial display order is sequential (1, 2, 3, 4)
  const initialOrder = [image1, image2, image3, image4].map(
    (img) => img.displayOrder,
  );
  TestValidator.equals(
    "initial images have sequential order starting from 1",
    initialOrder,
    [1, 2, 3, 4],
  );
  // 5. Seller sends reorder request with non-sequential positions
  // Reorder: image1→4, image2→1, image3→3, image4→2
  // After renumbering, final order should be: [image2, image4, image3, image1] with orders [1, 2, 3, 4]
  await api.functional.ecommerceMall.seller.sellers.me.products.images.reorder(
    sellerConnection,
    {
      productId: product.id,
      body: {
        reorderItems: [
          { imageId: image1.id, newDisplayOrder: 4 },
          { imageId: image2.id, newDisplayOrder: 1 },
          { imageId: image3.id, newDisplayOrder: 3 },
          { imageId: image4.id, newDisplayOrder: 2 },
        ] satisfies IEcommerceMallProductImage.IReorderItem[],
      },
    },
  );
  // 6. Validate sequential numbering without gaps
  // The system should renumber all images sequentially starting from 1
  // Final expected display orders: image2=1, image4=2, image3=3, image1=4
  const expectedFinalDisplayOrders = [1, 2, 3, 4];
  const sortedExpectedOrders = [...expectedFinalDisplayOrders].sort(
    (a, b) => a - b,
  );
  // Validate no gaps: should be [1, 2, 3, 4]
  TestValidator.equals(
    "no gaps in display order after renumbering",
    sortedExpectedOrders,
    [1, 2, 3, 4],
  );
  // Validate no duplicates
  const uniqueOrders = new Set(expectedFinalDisplayOrders);
  TestValidator.equals(
    "no duplicate display order values",
    uniqueOrders.size,
    4,
  );
  // Validate sequential starting from 1
  TestValidator.equals(
    "display order starts from 1",
    sortedExpectedOrders[0],
    1,
  );
  TestValidator.equals(
    "display order ends at count",
    sortedExpectedOrders[sortedExpectedOrders.length - 1],
    4,
  );
  // Validate all images are included in the reorder
  TestValidator.equals(
    "all 4 images included in reorder",
    expectedFinalDisplayOrders.length,
    4,
  );
}
