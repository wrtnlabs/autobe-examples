import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { generate_random_ecommerce_mall_seller_products_images_upload_images } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_upload_images";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_product_image_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller account setup
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // 2. Create seller-specific connection with token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerJoinResult.token.access}`,
  };
  // 3. Upload 3 images sequentially
  const imageUrls = [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg",
  ];
  // 4. Upload first image
  const firstImage =
    await api.functional.ecommerceMall.seller.products.images.uploadImages(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          image_url: imageUrls[0],
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(firstImage);
  // 5. Upload second image
  const secondImage =
    await api.functional.ecommerceMall.seller.products.images.uploadImages(
      sellerConnection,
      {
        productId: firstImage.product.id,
        body: {
          image_url: imageUrls[1],
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(secondImage);
  // 6. Upload third image
  const thirdImage =
    await api.functional.ecommerceMall.seller.products.images.uploadImages(
      sellerConnection,
      {
        productId: secondImage.product.id,
        body: {
          image_url: imageUrls[2],
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(thirdImage);
  // 7. Verify display_order is sequential
  TestValidator.equals(
    "second image has higher order than first",
    secondImage.display_order,
    firstImage.display_order + 1,
  );
  TestValidator.equals(
    "third image has higher order than second",
    thirdImage.display_order,
    secondImage.display_order + 1,
  );
  // 8. Verify all images belong to same product
  TestValidator.equals(
    "first image product matches",
    firstImage.product.id,
    secondImage.product.id,
  );
  TestValidator.equals(
    "second image product matches",
    secondImage.product.id,
    thirdImage.product.id,
  );
  // 9. Verify first image has lowest display_order (main thumbnail)
  TestValidator.predicate(
    "first image has lowest display_order",
    firstImage.display_order < secondImage.display_order &&
      firstImage.display_order < thirdImage.display_order,
  );
}