import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_product_image_reorder_thumbnail_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as a seller using join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Register as an admin using join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 3. Create a product category using admin authentication
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. Create a product as the authenticated seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Upload the first image to the product (becomes display_order 0, main thumbnail)
  const firstImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(firstImage);
  // Verify first image has display_order 0
  TestValidator.equals(
    "first image display_order is 0",
    firstImage.displayOrder,
    0,
  );
  // 6. Upload a second image (becomes display_order 1)
  const secondImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(secondImage);
  // Verify second image has display_order 1
  TestValidator.equals(
    "second image display_order is 1",
    secondImage.displayOrder,
    1,
  );
  const originalSecondImageUpdatedAt = secondImage.updatedAt;
  // 7. Update the second image's display_order to 0 using the target endpoint
  const updatedImage =
    await api.functional.ecommerceMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        productImageId: secondImage.id,
        body: {
          display_order: 0,
        } satisfies IEcommerceMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // 8. Verify the response shows the expected changes
  // The updated image (originally second) should now have display_order 0 (main thumbnail)
  TestValidator.equals(
    "updated image now has display_order 0",
    updatedImage.displayOrder,
    0,
  );
  // The updated_at timestamp should have changed from the original
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedImage.updatedAt,
    originalSecondImageUpdatedAt,
  );
  // Verify the image identity is preserved
  TestValidator.equals("image id unchanged", updatedImage.id, secondImage.id);
  TestValidator.equals(
    "image url unchanged",
    updatedImage.imageUrl,
    secondImage.imageUrl,
  );
  // 9. Business validation: The image's new position (display_order 0) makes it the main thumbnail
  // This is validated by checking display_order is 0, which the server uses to determine thumbnail
  TestValidator.predicate(
    "reordered image is now main thumbnail",
    updatedImage.displayOrder === 0,
  );
}