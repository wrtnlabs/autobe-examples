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
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_product_image_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create product with seller
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(product);
  // 3. Capture initial image state
  const initialImages: IEcommerceMallProductImage[] = product.images;
  const imageIds = initialImages.map((img) => img.id);
  // Verify we have at least 2 images for meaningful reordering
  TestValidator.predicate(
    "has enough images for reordering",
    imageIds.length >= 2,
  );
  // Reverse the order for reordering test
  const reversedImageIds = [...imageIds].reverse();
  // 4. Create image order management request with reversed sequence
  const imageOrderRequests: IEcommerceMallProductImage.IManageRequestImageOrder[] =
    reversedImageIds.map((imageId, index) => ({
      imageId,
      newDisplayOrder: index + 1,
    }));
  const manageRequest: IEcommerceMallProductImage.IManageRequest = {
    imageOrders: imageOrderRequests,
  };
  // 5. Perform reordering operation
  const updatedImages: IEcommerceMallProductImage.ISummary[] =
    typia.assert<IEcommerceMallProductImage.ISummary[]>(
      await api.functional.ecommerceMall.products.images.manage(
        sellerConnection,
        {
          productId: product.id,
          body: manageRequest,
        },
      ),
    );
  // 6. Validate display order sequence is sequential starting from 1
  const expectedDisplayOrders = ArrayUtil.repeat(
    updatedImages.length,
    (index: number) => index + 1,
  );
  const actualDisplayOrders = updatedImages.map((img) => img.display_order);
  TestValidator.equals(
    "images returned in sequential ascending order",
    actualDisplayOrders,
    expectedDisplayOrders,
  );
  // 7. Validate first image has display order 1 (primary thumbnail)
  TestValidator.equals(
    "first image has display order 1",
    updatedImages[0].display_order,
    1,
  );
  // 8. Validate all image IDs are preserved
  const updatedImageIds = updatedImages.map((img) => img.id);
  TestValidator.equals(
    "all image IDs preserved",
    updatedImageIds.sort(),
    imageIds.sort(),
  );
  // 9. Validate image URLs are unchanged
  for (const updatedImg of updatedImages) {
    const originalImg = initialImages.find(
      (original) => original.id === updatedImg.id,
    );
    if (originalImg) {
      TestValidator.equals(
        `image ${updatedImg.id} URL preserved`,
        updatedImg.image_url,
        originalImg.image_url,
      );
    }
  }
  // 10. Validate timestamps and metadata preserved
  for (const updatedImg of updatedImages) {
    const originalImg = initialImages.find(
      (original) => original.id === updatedImg.id,
    );
    if (originalImg) {
      // Check created_at is preserved
      TestValidator.equals(
        `image ${updatedImg.id} created_at preserved`,
        updatedImg.created_at,
        originalImg.created_at,
      );
      // Check deleted_at is null (active image)
      TestValidator.equals(
        `image ${updatedImg.id} is active (deleted_at null)`,
        updatedImg.deleted_at,
        null,
      );
    }
  }
  // 11. Validate all images have valid timestamps
  for (const img of updatedImages) {
    typia.assert(img.created_at);
    typia.assert(img.display_order);
  }
}