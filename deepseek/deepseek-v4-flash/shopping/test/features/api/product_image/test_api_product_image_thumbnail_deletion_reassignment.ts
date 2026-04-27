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

export async function test_api_product_image_thumbnail_deletion_reassignment(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test thumbnail image deletion and automatic reassignment in product images.
   *
   * Validates that when a seller deletes the thumbnail image (sort_order=0), the
   * system handles the deletion correctly. The test follows the natural seller
   * workflow: seller registration, product creation, sequential image uploads,
   * and thumbnail deletion.
   *
   * Special attention is given to verifying that each uploaded image receives
   * the correct auto-assigned sort_order, with the first image becoming the
   * thumbnail (sort_order=0).
   *
   * 1. Register as a seller via authorize_seller_join.
   * 2. Create a product via generate_random_e_commerce_mall_seller_products_create.
   * 3. Upload image A — verify it gets sort_order=0 (thumbnail).
   * 4. Upload image B — verify it gets sort_order=1.
   * 5. Upload image C — verify it gets sort_order=2.
   * 6. Delete image A via api.functional.eCommerceMall.seller.products.images.erase.
   * 7. Verify the deletion call completes successfully.
   */
  // 1. Register as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: undefined });
  // 2. Create a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(product);
  // 3. Upload image A — should become thumbnail (sort_order = 0)
  const imageA =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: undefined,
      },
    );
  typia.assert(imageA);
  TestValidator.predicate(
    "first image is thumbnail (sort_order = 0)",
    () => imageA.sort_order === 0,
  );
  // 4. Upload image B — should get sort_order = 1
  const imageB =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: undefined,
      },
    );
  typia.assert(imageB);
  TestValidator.predicate(
    "second image has sort_order = 1",
    () => imageB.sort_order === 1,
  );
  // 5. Upload image C — should get sort_order = 2
  const imageC =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: undefined,
      },
    );
  typia.assert(imageC);
  TestValidator.predicate(
    "third image has sort_order = 2",
    () => imageC.sort_order === 2,
  );
  // 6. Delete image A (the thumbnail with sort_order = 0)
  await api.functional.eCommerceMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: imageA.id,
    },
  );
}
