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

export async function test_api_product_images_upload_limit_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // Create new seller-specific connection with token
  const newSellerConnection: api.IConnection = { host: connection.host };
  newSellerConnection.headers = {
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    newSellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload 20 images (boundary case - maximum capacity)
  const maxImages = 20;
  const uploadedImages: IEcommerceMallProductImage.ICreate[] = [];
  for (let i = 0; i < maxImages; i++) {
    const image =
      await generate_random_ecommerce_mall_seller_products_images_create(
        newSellerConnection,
        {
          params: { productId: product.id },
          body: {
            image_url: `https://example.com/images/product-${product.id}-${i}.jpg`,
            display_order: i,
          } satisfies IEcommerceMallProductImage.ICreate,
        },
      );
    uploadedImages.push(image);
  }
  TestValidator.equals(
    "uploaded image count",
    uploadedImages.length,
    maxImages,
  );
  // 4. Attempt to upload 21st image (should fail)
  await TestValidator.error("21st image rejected", async () => {
    await generate_random_ecommerce_mall_seller_products_images_create(
      newSellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: `https://example.com/images/product-${product.id}-20.jpg`,
          display_order: maxImages,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  });
  // 5. Validate image display order sequence using uploadedImages
  for (let i = 0; i < maxImages; i++) {
    const image = uploadedImages.find(
      (img: IEcommerceMallProductImage.ICreate) => img.display_order === i,
    );
    TestValidator.predicate(
      `image with display_order ${i} exists`,
      image !== undefined,
    );
  }
  // 6. Verify first image serves as thumbnail (display_order 0)
  const sortedImages = [...uploadedImages].sort(
    (
      a: IEcommerceMallProductImage.ICreate,
      b: IEcommerceMallProductImage.ICreate,
    ) => a.display_order - b.display_order,
  );
  const thumbnail = sortedImages[0];
  TestValidator.equals(
    "thumbnail display_order is 0",
    thumbnail.display_order,
    0,
  );
}
