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
 * Test retrieving a product image from another seller's product.
 *
 * This validates the Cross-Seller Modification Prevention business rule.
 *
 * Steps:
 * 1. Register and authenticate as Seller A
 * 2. Create a product and upload an image as Seller A
 * 3. Register and authenticate as Seller B
 * 4. Attempt to retrieve the image from Seller A's product using Seller B's authentication
 *
 * Expected validation:
 * - Response status: 403 Forbidden
 * - Error message indicates the seller is not authorized to access this product's images
 * - The system correctly enforces ownership validation - only the owning seller can view product images
 * - Image from another seller's product is protected from unauthorized access
 */
export async function test_api_product_image_retrieval_by_non_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate as Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  // Step 2: Create a product and upload an image as Seller A
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {
      body: {},
    },
  );
  typia.assert(product);
  const productImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(productImage);
  // Step 3: Register and authenticate as Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // Step 4: Attempt to retrieve the image from Seller A's product using Seller B's authentication
  // This should fail with 403 Forbidden because Seller B does not own the product
  await TestValidator.error(
    "non-owner seller cannot retrieve product image",
    async () => {
      await api.functional.ecommerceMall.seller.products.images.at(
        sellerBConnection,
        {
          productId: product.id,
          imageId: productImage.id,
        },
      );
    },
  );
}
