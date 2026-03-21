import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test retrieving a specific product image by its unique identifier as the owning seller.
 *
 * This E2E test validates the primary success path for image retrieval:
 * 1. Register and authenticate as a seller via POST /ecommerceMall/auth/seller/join
 * 2. Create a product via POST /ecommerceMall/seller/products with valid data
 * 3. Upload an image to the product via POST /ecommerceMall/seller/products/{productId}/images
 * 4. Retrieve the uploaded image via GET /ecommerceMall/seller/products/{productId}/images/{imageId}
 *
 * Expected validation:
 * - Response status: 200 OK
 * - Response body contains IEcommerceMallProductImage schema with: id, image_url, display_order (0 for first image), created_at, updated_at, and product relation
 * - The image_url matches the uploaded URL
 * - The display_order is correctly assigned (0 for first image)
 * - The product relationship is correctly populated
 */
export async function test_api_product_image_retrieval_by_owning_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Step 2: Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Step 3: Upload an image to the product
  const productImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(productImage);
  // Step 4: Retrieve the uploaded image by its ID
  const retrievedImage =
    await api.functional.ecommerceMall.seller.products.images.at(
      sellerConnection,
      {
        productId: product.id,
        imageId: productImage.id,
      },
    );
  typia.assert(retrievedImage);
  // Validate retrieved image properties
  TestValidator.equals("image ID matches", retrievedImage.id, productImage.id);
  TestValidator.equals(
    "image URL matches",
    retrievedImage.image_url,
    productImage.image_url,
  );
  TestValidator.equals(
    "display order is 0 for first image",
    retrievedImage.display_order,
    0,
  );
  TestValidator.equals(
    "product relation ID matches",
    retrievedImage.product.id,
    product.id,
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    retrievedImage.created_at !== null &&
      retrievedImage.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid updated_at timestamp",
    retrievedImage.updated_at !== null &&
      retrievedImage.updated_at !== undefined,
  );
}
