import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductImageIReorderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImageIReorderItem";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductImage";
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

export async function test_api_seller_product_image_reorder_thumbnail_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(seller);
  // 2. Create a product for the seller
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 3. Upload 3 images with display_order 0, 1, 2
  const images: IEcommerceMallProductImage[] = await Promise.all(
    ArrayUtil.repeat(3, (index) =>
      generate_random_ecommerce_mall_seller_products_images_create(
        sellerConnection,
        {
          body: {
            image_url: typia.random<string & tags.MaxLength<80000>>(),
            display_order: index,
            alt_text: RandomGenerator.name(),
          },
          params: { productId: product.id },
        },
      ),
    ),
  );
  typia.assert(images);
  // Store image URLs before reordering
  const originalFirstImageUrl: string = images[0].image_url;
  const secondImageUrl: string = images[1].image_url;
  const thirdImageUrl: string = images[2].image_url;
  // 4. Create reorder request - move image at index 2 to position 0
  const reorderBody: IEcommerceMallProductImage.IReorder = {
    images: [
      {
        image_id: images[2].id,
        display_order: 0,
      },
      {
        image_id: images[0].id,
        display_order: 1,
      },
      {
        image_id: images[1].id,
        display_order: 2,
      },
    ],
  } satisfies IEcommerceMallProductImage.IReorder;
  // 5. Execute reorder operation
  const reorderResponse: IPageIEcommerceMallProductImage.ISummary =
    await api.functional.ecommerceMall.seller.products.images.reorder.patchByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: reorderBody,
      },
    );
  typia.assert(reorderResponse);
  // 6. Validate response contains 3 images
  TestValidator.equals(
    "image count after reorder",
    reorderResponse.data.length,
    3,
  );
  // 7. Verify the new thumbnail (was at index 2, now at position 0)
  const newThumbnail: IEcommerceMallProductImage.ISummary | undefined =
    reorderResponse.data.find((img) => img.display_order === 0);
  TestValidator.notEquals(
    "new thumbnail is the moved image",
    newThumbnail?.image_url,
    originalFirstImageUrl,
  );
  TestValidator.equals(
    "new thumbnail is the third uploaded image",
    newThumbnail?.image_url,
    thirdImageUrl,
  );
  // 8. Verify previous main image is now at position 1
  const oldThumbnail: IEcommerceMallProductImage.ISummary | undefined =
    reorderResponse.data.find((img) => img.display_order === 1);
  TestValidator.equals(
    "old thumbnail is now at position 1",
    oldThumbnail?.image_url,
    originalFirstImageUrl,
  );
  // 9. Verify second image is now at position 2
  const secondImageNow: IEcommerceMallProductImage.ISummary | undefined =
    reorderResponse.data.find((img) => img.display_order === 2);
  TestValidator.equals(
    "second image is now at position 2",
    secondImageNow?.image_url,
    secondImageUrl,
  );
  // 10. Verify display_order sequence is correct (0, 1, 2)
  const displayOrders: number[] = reorderResponse.data
    .map((img) => img.display_order)
    .sort();
  TestValidator.equals(
    "display_order sequence is 0, 1, 2",
    displayOrders,
    [0, 1, 2],
  );
  // 11. Verify all images still exist with correct IDs
  const reorderedIds: string[] = reorderResponse.data
    .map((img) => img.id)
    .sort();
  const expectedIds: string[] = images
    .map((img) => img.id)
    .slice()
    .sort();
  TestValidator.equals(
    "all images exist after reorder",
    reorderedIds,
    expectedIds,
  );
  // 12. Verify each image has correct display_order in sequence
  reorderResponse.data.forEach((img, index) => {
    const expectedOrder: number = index;
    TestValidator.equals(
      `image at position ${index} has correct display_order`,
      img.display_order,
      expectedOrder,
    );
  });
  // 13. Verify product images are updated with new order
  TestValidator.equals(
    "product has correct image count",
    product.images.length,
    3,
  );
  // 14. Verify all image IDs in product match reorder response
  const productImageIds: string[] = product.images.map((img) => img.id).sort();
  TestValidator.equals(
    "product image IDs match reorder response",
    productImageIds,
    reorderedIds,
  );
}