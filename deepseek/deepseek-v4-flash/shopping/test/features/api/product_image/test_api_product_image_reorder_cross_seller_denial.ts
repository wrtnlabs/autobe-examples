import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_images_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test that a seller cannot reorder images of a product owned by another seller.
 *
 * Validates the cross-seller image reorder denial rule ([311]). A seller must only be able to reorder images of their own products.
 * Attempts by another seller to reorder images must be rejected with a 403 Forbidden error, and the original sort_order of the images must remain unchanged.
 *
 * 1. Seller A registers as a seller and creates a product.
 * 2. Seller A uploads two images to the product.
 * 3. Seller B registers as a different seller.
 * 4. Seller B attempts to reorder Seller A's product images.
 * 5. Verify the operation is rejected with a 403 Forbidden error.
 * 6. Verify the images' sort_order values are preserved.
 */
export async function test_api_product_image_reorder_cross_seller_denial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  // 2. Seller A creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(product);
  // 3. Seller A uploads two images to their product
  const image1 =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  // Store original sort orders for verification
  const originalSortOrder1 = image1.sort_order;
  const originalSortOrder2 = image2.sort_order;
  // 4. Join as Seller B (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  // 5. Seller B attempts to reorder Seller A's product images
  // This should be rejected with 403 Forbidden (cross-seller denial per [311])
  await TestValidator.httpError(
    "cross-seller image reorder should be forbidden",
    403,
    async () => {
      await api.functional.eCommerceMall.seller.products.images.reorder(
        sellerBConnection,
        {
          productId: product.id,
          body: {
            values: [image2.id, image1.id],
          } satisfies IECommerceMallProductImage.IReorder,
        },
      );
    },
  );
  // 6. Verify the images retain their original sort_order
  TestValidator.equals(
    "image1 sort_order unchanged",
    image1.sort_order,
    originalSortOrder1,
  );
  TestValidator.equals(
    "image2 sort_order unchanged",
    image2.sort_order,
    originalSortOrder2,
  );
}
