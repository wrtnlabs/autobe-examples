import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
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
 * Test that a customer can view product images sorted by upload date in descending order.
 *
 * Validates the image gallery sorting functionality by creating a product with multiple images uploaded at different times, then querying them with sort=created_at and order=desc. Ensures that the chronological sort order overrides the default display_order sorting and that each image summary includes all required fields.
 *
 * 1. Administrator creates a top-level category for the product.
 * 2. An approved seller creates a product under the category.
 * 3. The seller uploads three images sequentially to the product gallery.
 * 4. A customer authenticates and requests images sorted by created_at descending.
 * 5. Validates that images are ordered newest-first by comparing adjacent created_at timestamps.
 * 6. Verifies pagination metadata accurately reflects the total image count.
 */
export async function test_api_product_image_gallery_sorted_by_creation_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller creates a product
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
  // 3. Upload multiple images sequentially
  const imageCount = 3;
  for (let i = 0; i < imageCount; i++) {
    const image =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
        },
      );
    typia.assert(image);
  }
  // 4. Customer queries images sorted by created_at descending
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const result =
    await api.functional.shoppingMall.customer.products.images.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallProductImage.IRequest,
      },
    );
  typia.assert(result);
  // 5. Validate descending order by created_at
  const data = result.data;
  TestValidator.predicate("at least one image returned", data.length >= 1);
  for (let i = 0; i < data.length - 1; i++) {
    TestValidator.predicate(
      `image at index ${i} should have created_at >= image at index ${i + 1} (descending order)`,
      new Date(data[i].created_at).getTime() >=
        new Date(data[i + 1].created_at).getTime(),
    );
  }
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination records count matches data length",
    result.pagination.records,
    data.length,
  );
}
