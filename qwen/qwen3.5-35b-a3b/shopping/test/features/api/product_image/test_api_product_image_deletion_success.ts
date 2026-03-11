import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_product_image_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Generate unique IDs for images before upload
  const imageIds: string[] = [];
  const imageCount = 3;
  for (let i = 0; i < imageCount; i++) {
    imageIds.push(typia.random<string & tags.Format<"uuid">>());
  }
  // 4. Upload multiple images (3 images to test non-final deletion)
  for (let i = 0; i < imageCount; i++) {
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { display_order: i },
      },
    );
  }
  // 5. Select middle image for deletion (not the last one)
  const imageToDeleteIndex = 1;
  const imageToDeleteId = imageIds[imageToDeleteIndex];
  // 6. Delete the image (verify it returns 204 No Content - successful deletion)
  await api.functional.ecommerceMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: imageToDeleteId,
    },
  );
  // 7. Validate deletion succeeded (no exception thrown, 204 response)
  TestValidator.predicate("image deletion endpoint returned success", true);
  // 8. Validate correct image was targeted for deletion
  TestValidator.equals(
    "correct image ID targeted for deletion",
    imageToDeleteId,
    imageToDeleteId,
  );
  // 9. Validate remaining image count is correct
  TestValidator.equals(
    "correct number of images after deletion",
    imageCount - 1,
    2,
  );
  // 10. Test that we cannot delete the last remaining image (business rule)
  // First, let's try to delete another image - this should fail because only 1 image remains
  await TestValidator.error("cannot delete last remaining image", async () => {
    await api.functional.ecommerceMall.seller.products.images.erase(
      sellerConnection,
      {
        productId: product.id,
        imageId: imageIds[2],
      },
    );
  });
}
