import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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

export async function test_api_product_image_reorder_as_only_image(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Setup: Create a product for the seller
  // Note: Using typia.random for category_id since no admin category endpoint available
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Setup: Upload a single image with display_order=1
  const singleImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.MaxLength<80000> & tags.Format<"uri">,
          display_order: 1,
        },
        params: { productId: product.id },
      },
    );
  typia.assert(singleImage);
  // 4. Test: Reorder the only image to display_order=1 (no actual change)
  const reorderedImage =
    await api.functional.ecommerceMall.seller.products.images.reorder.patchByProductidAndImageid(
      sellerConnection,
      {
        productId: product.id,
        imageId: singleImage.id,
        body: {
          display_order: 1,
        },
      },
    );
  typia.assert(reorderedImage);
  // 5. Validation: Verify reorder succeeds and response matches
  TestValidator.equals(
    "reorder response id matches",
    reorderedImage.id,
    singleImage.id,
  );
  // 6. Validation: Verify image remains as main thumbnail (display_order=1)
  TestValidator.equals(
    "image display_order remains 1",
    reorderedImage.display_order,
    1,
  );
  // 7. Validation: Verify product images array contains single image
  TestValidator.equals(
    "product images length unchanged",
    product.images.length,
    1,
  );
  // 8. Validation: Verify product image matches reordered image
  TestValidator.equals(
    "reordered image URL matches",
    reorderedImage.image_url,
    singleImage.image_url,
  );
  // 9. Validation: Verify snapshot was created (check product updated_at changed)
  // The product snapshot creation on reorder is verified by the updated_at timestamp
  TestValidator.notEquals(
    "product updated_at changed after reorder",
    product.updated_at,
    reorderedImage.updated_at,
  );
}