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

export async function test_api_seller_product_images_reorder_single_image(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerAuthorized);
  // 2. Generate a category (required for product creation)
  const category: IEcommerceMallCategory.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    sort_order: null,
    parent: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // 3. Create product
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: category.id,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 4. Upload 1 product image
  const image =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"uri">
          >(),
          display_order: 1,
        } satisfies IEcommerceMallProductImage.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(image);
  // 5. Verify initial image state: only 1 image exists with display_order=1
  TestValidator.equals("display order", image.display_order, 1);
  TestValidator.equals("product_id matches", image.product_id, product.id);
  // 6. Reorder the single image (edge case: same single image)
  const reorderBody = {
    image_ids: [image.id],
  } satisfies IEcommerceMallProduct.IReorder;
  const reorderResponse: IEcommerceMallProductImage.IReorderResponse =
    await api.functional.ecommerceMall.seller.products.images.reorder.patchByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: reorderBody,
      },
    );
  typia.assert(reorderResponse);
  // 7. Validate response returns the same image with display_order=1
  TestValidator.equals("image count", reorderResponse.images.length, 1);
  TestValidator.equals(
    "display order after reorder",
    reorderResponse.images[0].display_order,
    1,
  );
  TestValidator.equals(
    "image ID unchanged",
    reorderResponse.images[0].id,
    image.id,
  );
  TestValidator.equals(
    "image URL unchanged",
    reorderResponse.images[0].image_url satisfies string as string,
    image.image_url satisfies string as string,
  );
  // 8. Verify the image remains active and visible (deleted_at should be null)
  TestValidator.equals(
    "image still active",
    reorderResponse.images[0].deleted_at,
    null,
  );
  // 9. Verify product has at least one image in its images array
  TestValidator.notEquals("product has images", product.images.length, 0);
  TestValidator.predicate(
    "first image is main thumbnail",
    product.images[0]?.id === image.id,
  );
}
