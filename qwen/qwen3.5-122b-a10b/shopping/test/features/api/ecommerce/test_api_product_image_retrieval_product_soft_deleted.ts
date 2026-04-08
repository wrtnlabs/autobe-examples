import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_images_create } from "../../../generate/generate_random_ecommerce_seller_products_images_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test product image retrieval returns 404 when product is soft-deleted.
 *
 * Validates that attempting to access product images after the parent product has been soft-deleted results in a 404 Not Found response. This ensures proper data privacy and lifecycle management where deleted products and their associated images become inaccessible through public endpoints.
 *
 * The test follows this workflow:
 * 1. Seller registers and authenticates to the platform
 * 2. Seller creates a product with at least one image
 * 3. Seller deletes the product via soft-delete operation
 * 4. Attempt to retrieve the image using the public product image endpoint
 * 5. Validate that the request fails with 404 Not Found error
 *
 * This validates the business rule that soft-deleted products should not expose any of their data, including images, to prevent unauthorized access to deleted content.
 */
export async function test_api_product_image_retrieval_product_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Seller creates a product with at least one image
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri"> & tags.MaxLength<80000>>(),
          } satisfies IEcommerceProductImage.ICreate,
        ],
      },
    },
  );
  typia.assert(product);
  // Ensure product has at least one image
  if (product.productImages.length === 0) {
    throw new Error("Product must have at least one image");
  }
  const image = product.productImages[0];
  // 3. Seller deletes the product (soft-delete)
  await api.functional.ecommerce.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 4. Attempt to retrieve the image from the deleted product
  await TestValidator.httpError(
    "image retrieval from soft-deleted product should return 404",
    404,
    async () => {
      await api.functional.ecommerce.products.images.at(connection, {
        productId: product.id,
        imageId: image.id,
      });
    },
  );
}
