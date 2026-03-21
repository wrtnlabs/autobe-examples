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

export async function test_api_product_image_reorder_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Create a product with required fields
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload multiple images (at least 3) to the product
  const imageUrls = [
    "https://example.com/images/product-image-1.jpg",
    "https://example.com/images/product-image-2.jpg",
    "https://example.com/images/product-image-3.jpg",
  ] as (string & tags.Format<"url">)[];
  const images: IEcommerceMallProductImage[] = [];
  for (const imageUrl of imageUrls) {
    const image =
      await generate_random_ecommerce_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: { imageUrls: [imageUrl] },
        },
      );
    typia.assert(image);
    images.push(image);
  }
  // 4. Verify initial display_order values
  TestValidator.equals("first image order", images[0].display_order, 0);
  TestValidator.equals("second image order", images[1].display_order, 1);
  TestValidator.equals("third image order", images[2].display_order, 2);
  // 5. Reorder images: move image at position 2 to position 0, shifting others
  const reorderBody: IEcommerceMallProductImage.IReorder = {
    [images[2].id]: 0,
    [images[0].id]: 1,
    [images[1].id]: 2,
  };
  const reorderedImagesResponse =
    await api.functional.ecommerceMall.seller.products.images.reorder(
      sellerConnection,
      {
        productId: product.id,
        body: reorderBody,
      },
    );
  typia.assert(reorderedImagesResponse);
  const reorderedImages = typia.assert<
    Record<string, number & tags.Type<"uint32">>
  >(reorderedImagesResponse);
  // 6. Verify response contains all image IDs with updated display_order
  TestValidator.equals(
    "reordered images count",
    Object.keys(reorderedImages).length,
    3,
  );
  // Find the image that should now be at position 0
  const newFirstImageId = Object.entries(reorderedImages).find(
    ([, order]) => order === 0,
  )?.[0];
  TestValidator.predicate(
    "has image at position 0",
    newFirstImageId !== undefined,
  );
  TestValidator.equals(
    "new first image is former last",
    newFirstImageId,
    images[2].id,
  );
  // 7. Verify display orders remain contiguous without gaps
  const displayOrders = Object.values(reorderedImages).sort((a, b) => a - b);
  TestValidator.equals("position 0 exists", displayOrders.includes(0), true);
  TestValidator.equals("position 1 exists", displayOrders.includes(1), true);
  TestValidator.equals("position 2 exists", displayOrders.includes(2), true);
}