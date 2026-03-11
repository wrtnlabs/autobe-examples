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

export async function test_api_product_image_update_display_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: null,
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_active: true,
      },
    },
  );
  typia.assert(product);
  // 3. Upload multiple images with sequential display orders
  const image1 = typia.assert<IEcommerceMallProductImage>(
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          image_url: typia.random<
            string & tags.Format<"uri"> & tags.MaxLength<80000>
          >(),
          display_order: 0,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    ),
  );
  typia.assert(image1);
  const image2 = typia.assert<IEcommerceMallProductImage>(
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          image_url: typia.random<
            string & tags.Format<"uri"> & tags.MaxLength<80000>
          >(),
          display_order: 1,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    ),
  );
  typia.assert(image2);
  const image3 = typia.assert<IEcommerceMallProductImage>(
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          image_url: typia.random<
            string & tags.Format<"uri"> & tags.MaxLength<80000>
          >(),
          display_order: 2,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    ),
  );
  typia.assert(image3);
  // 4. Validate initial display orders from creation responses
  TestValidator.equals(
    "first image has display_order 0",
    image1.display_order,
    0,
  );
  TestValidator.equals(
    "second image has display_order 1",
    image2.display_order,
    1,
  );
  TestValidator.equals(
    "third image has display_order 2",
    image3.display_order,
    2,
  );
  // 5. Update display order of first image to 5
  const updatedImage =
    await api.functional.ecommerceMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: image1.id,
        body: {
          display_order: 5,
        } satisfies IEcommerceMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // 6. Validate updated image
  TestValidator.equals("image_id matches", updatedImage.id, image1.id);
  TestValidator.equals(
    "display_order updated to 5",
    updatedImage.display_order,
    5,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedImage.updated_at,
    image1.updated_at,
  );
  // 7. Verify product has snapshot created (validate snapshot exists in product)
  TestValidator.notEquals("product has snapshots", product.snapshots.length, 0);
}
