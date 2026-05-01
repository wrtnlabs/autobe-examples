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
 * Test product image gallery default display order sorting.
 *
 * Validates that when a customer browses a product's image gallery without specifying any sort parameter, images are returned sorted by display_order in ascending order. The image with the lowest display_order (position 0) serves as the main thumbnail and appears first in the response.
 *
 * 1. Administrator creates a product category.
 * 2. Seller registers, creates a product in the category, and uploads multiple gallery images with sequential display_order values.
 * 3. Customer authenticates and requests the product's image list without sort parameters.
 * 4. Validates all uploaded images appear in the response, ordered by display_order ascending, each summary object has the required fields (id, image_url, display_order, created_at), and pagination metadata is accurate.
 */
export async function test_api_product_image_gallery_default_display_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator creates a product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registers and creates a product
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
  // 3. Upload multiple images to the product gallery
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
  // 4. Customer authenticates and browses the product image gallery
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const response =
    await api.functional.shoppingMall.customer.products.images.index(
      customerConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductImage.IRequest,
      },
    );
  typia.assert(response);
  // 5. Validate response
  TestValidator.equals(
    "image count matches uploaded count",
    response.data.length,
    imageCount,
  );
  TestValidator.equals(
    "pagination records count",
    response.pagination.records,
    imageCount,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  // Validate display_order ascending order
  for (let i = 0; i < response.data.length - 1; i++) {
    TestValidator.predicate(
      `images sorted by display_order ascending at index ${i}`,
      response.data[i].display_order <= response.data[i + 1].display_order,
    );
  }
  // Validate each image has required fields
  for (const image of response.data) {
    TestValidator.predicate("image has valid id", image.id.length > 0);
    TestValidator.predicate(
      "image has valid image_url",
      image.image_url.length > 0,
    );
    TestValidator.predicate(
      "image has valid created_at",
      image.created_at.length > 0,
    );
  }
}
