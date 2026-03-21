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
 * Test retrieving a product image where the imageId does not belong to the specified productId.
 * This validates the cross-reference validation between product and image.
 *
 * Steps:
 * 1. Register and authenticate as a seller
 * 2. Create first product
 * 3. Upload an image to the first product
 * 4. Create a second product
 * 5. Attempt to retrieve the first product's image using the second product's ID
 *
 * Expected: 404 Not Found - the system correctly validates that imageId belongs to productId
 */
export async function test_api_product_image_retrieval_with_mismatched_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create first product
  const firstProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(firstProduct);
  // 3. Upload an image to the first product
  const productImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: firstProduct.id },
      },
    );
  typia.assert(productImage);
  // 4. Create a second product
  const secondProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(secondProduct);
  // 5. Attempt to retrieve the first product's image using the second product's ID
  // Expected: 404 Not Found because the imageId belongs to firstProduct, not secondProduct
  await TestValidator.httpError(
    "image should not be found when productId mismatches",
    404,
    async () =>
      await api.functional.ecommerceMall.seller.products.images.at(
        sellerConnection,
        {
          productId: secondProduct.id,
          imageId: productImage.id,
        },
      ),
  );
}
