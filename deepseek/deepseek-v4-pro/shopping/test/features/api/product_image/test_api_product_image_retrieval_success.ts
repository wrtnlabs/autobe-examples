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
 * Test customer retrieval of a specific product image from a product's gallery.
 *
 * Validates the complete image retrieval flow: an administrator creates a
 * top-level product category, a seller registers and creates a product in that
 * category then uploads an image to its gallery, and finally a customer retrieves
 * the specific image using the composite productId + imageId path parameters.
 *
 * The test verifies four aspects of the image response beyond typia.assert's
 * structural validation: the image_url matches the uploaded value, the
 * display_order is 0 for the first uploaded image confirming it serves as the
 * main thumbnail, the nested product summary references the correct owning
 * product by matching IDs, and both created_at and updated_at timestamps are
 * populated as non-empty ISO 8601 date-time strings.
 *
 * 1. Administrator registers and creates a top-level product category.
 * 2. Seller registers, creates a product in the category, and uploads an image.
 * 3. Customer registers and retrieves the specific product image by its ID.
 * 4. Validates image URL, display_order, product reference, and timestamps.
 */
export async function test_api_product_image_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller creates product and uploads image
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
  const uploadedImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(uploadedImage);
  // 3. Customer retrieves the image
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const retrievedImage =
    await api.functional.shoppingMall.customer.products.images.at(
      customerConnection,
      {
        productId: product.id,
        imageId: uploadedImage.id,
      },
    );
  typia.assert(retrievedImage);
  // 4. Validate image response
  TestValidator.equals(
    "image url matches uploaded",
    retrievedImage.image_url,
    uploadedImage.image_url,
  );
  TestValidator.equals(
    "display order is 0 for first image",
    retrievedImage.display_order,
    0,
  );
  TestValidator.equals(
    "product id matches owning product",
    retrievedImage.product.id,
    product.id,
  );
  TestValidator.predicate(
    "created_at is populated",
    retrievedImage.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is populated",
    retrievedImage.updated_at.length > 0,
  );
}
