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

export async function test_api_product_image_reorder_conflict_duplicate_display_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create a product with a random category ID (since we can't create categories)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload 3 images with display_order values 1, 2, and 3
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"uri">
          >() satisfies string,
          display_order: 1,
        } satisfies IEcommerceMallProductImage.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"uri">
          >() satisfies string,
          display_order: 2,
        } satisfies IEcommerceMallProductImage.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"uri">
          >() satisfies string,
          display_order: 3,
        } satisfies IEcommerceMallProductImage.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(image3);
  // 4. Verify image3's original display_order is 3
  TestValidator.equals(
    "image3 original display_order is 3",
    image3.display_order,
    3,
  );
  // 5. Attempt to reorder image3 to display_order=2 (should fail with 409 Conflict)
  await TestValidator.httpError(
    "should return 409 when target display_order is occupied",
    409,
    async () => {
      await api.functional.ecommerceMall.seller.products.images.reorder.patchByProductidAndImageid(
        sellerConnection,
        {
          productId: product.id,
          imageId: image3.id,
          body: {
            display_order: 2,
          } satisfies IEcommerceMallProductImage.IReorder,
        },
      );
    },
  );
  // 6. Verify image3's display_order remains unchanged at 3 after failed reorder
  TestValidator.equals(
    "image3 display_order unchanged after failed reorder attempt",
    image3.display_order,
    3,
  );
  // 7. Attempt another invalid reorder (image2 to display_order=1 should also fail)
  await TestValidator.httpError(
    "should return 409 for image2 reorder conflict with display_order=1",
    409,
    async () => {
      await api.functional.ecommerceMall.seller.products.images.reorder.patchByProductidAndImageid(
        sellerConnection,
        {
          productId: product.id,
          imageId: image2.id,
          body: {
            display_order: 1,
          } satisfies IEcommerceMallProductImage.IReorder,
        },
      );
    },
  );
  // 8. Verify image2's display_order remains unchanged at 2
  TestValidator.equals(
    "image2 display_order unchanged after failed reorder attempt",
    image2.display_order,
    2,
  );
}
