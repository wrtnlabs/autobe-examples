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

export async function test_api_product_images_upload_success_multiple(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller authentication
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
  // Step 2: Create a product for image uploads
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 3: Upload 5 images with displayOrder 0-4
  const images: IEcommerceMallProductImage.ICreate[] = [];
  for (let i = 0; i < 5; i++) {
    const image =
      await generate_random_ecommerce_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            image_url: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri"> & tags.MaxLength<80000>,
            display_order: i,
          } satisfies IEcommerceMallProductImage.ICreate,
        },
      );
    typia.assert(image);
    images.push(image);
  }
  // Step 4: Validate image upload results
  TestValidator.equals(
    "first image has displayOrder 0",
    images[0].display_order,
    0,
  );
  TestValidator.equals(
    "second image has displayOrder 1",
    images[1].display_order,
    1,
  );
  TestValidator.equals(
    "third image has displayOrder 2",
    images[2].display_order,
    2,
  );
  TestValidator.equals(
    "fourth image has displayOrder 3",
    images[3].display_order,
    3,
  );
  TestValidator.equals(
    "fifth image has displayOrder 4",
    images[4].display_order,
    4,
  );
  // Step 5: Validate all image URLs are valid URIs
  for (let i = 0; i < 5; i++) {
    TestValidator.predicate(`image ${i} has valid URI`, () =>
      typia.is<string & tags.Format<"uri">>(
        images[i].image_url as unknown as string & tags.Format<"uri">,
      ),
    );
  }
  // Step 6: Verify image sequence (displayOrder ascending order)
  TestValidator.predicate("images sorted by displayOrder ascending", () => {
    for (let i = 0; i < images.length - 1; i++) {
      if (images[i].display_order >= images[i + 1].display_order) {
        return false;
      }
    }
    return true;
  });
  // Step 7: Verify first image is main thumbnail (displayOrder 0)
  TestValidator.predicate(
    "first image serves as main thumbnail",
    () => images[0].display_order === 0,
  );
}