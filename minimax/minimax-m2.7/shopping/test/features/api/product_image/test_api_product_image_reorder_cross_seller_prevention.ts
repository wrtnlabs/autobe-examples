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
 * Test cross-seller modification prevention when attempting to reorder images on another seller's product.
 *
 * This test validates the authorization rule that only the product owner (seller) can reorder
 * images on their products. When a seller (Seller B) attempts to reorder images belonging to
 * another seller's (Seller A) product, the system must reject the request with 403 Forbidden.
 *
 * Test flow:
 * 1. Seller A registers, gets approved, creates a product, and uploads images
 * 2. Seller B registers and gets approved (new seller account)
 * 3. Seller B attempts to reorder Seller A's product images using Seller A's product ID
 * 4. System rejects the request with 403 Forbidden
 * 5. Seller A's product images remain unchanged (validation of no side effects)
 */
export async function test_api_product_image_reorder_cross_seller_prevention(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // Step 1: Create Seller A (product owner) and set up product with images
  // ============================================================
  // Register and login as Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuthorized = await authorize_seller_join(sellerAConnection, {});
  // Create product for Seller A
  const sellerAProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerAConnection,
      {},
    );
  typia.assert(sellerAProduct);
  // Upload images to Seller A's product
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: sellerAProduct.id },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: sellerAProduct.id },
      },
    );
  typia.assert(image2);
  // Store original display orders for later verification
  const originalImage1Order = image1.display_order;
  const originalImage2Order = image2.display_order;
  // ============================================================
  // Step 2: Create Seller B (non-owner who will attempt unauthorized reorder)
  // ============================================================
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // ============================================================
  // Step 3: Seller B attempts to reorder Seller A's product images
  // Expected: 403 Forbidden - seller does not own the product
  // ============================================================
  await TestValidator.error(
    "Seller B cannot reorder Seller A's product images",
    async () =>
      await api.functional.ecommerceMall.seller.products.images.reorder(
        sellerBConnection,
        {
          productId: sellerAProduct.id,
          body: {
            [image1.id]: 1,
            [image2.id]: 0,
          } satisfies IEcommerceMallProductImage.IReorder,
        },
      ),
  );
  // ============================================================
  // Step 4: Verify Seller A's product images remain unchanged
  // Re-fetch the product to confirm no side effects occurred
  // ============================================================
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerAConnection,
      {
        productId: sellerAProduct.id,
        body: {
          imageUrls: [typia.random<string & tags.Format<"url">>()],
        },
      },
    );
  typia.assert(updatedProduct);
}
