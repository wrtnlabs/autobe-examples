import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
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

export async function test_api_product_image_reorder_to_main_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminRequestConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminRequestConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create a category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: 10000,
      },
    },
  );
  typia.assert(product);
  // 6. Upload first image (becomes main thumbnail with display_order=0)
  const firstImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: "https://example.com/images/product-first.jpg",
        },
      },
    );
  typia.assert(firstImage);
  TestValidator.equals(
    "first image has displayOrder 0",
    firstImage.displayOrder,
    0,
  );
  // 7. Upload second image
  const secondImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: "https://example.com/images/product-second.jpg",
        },
      },
    );
  typia.assert(secondImage);
  TestValidator.equals(
    "second image has displayOrder 1",
    secondImage.displayOrder,
    1,
  );
  // Store original updatedAt to verify it changes
  const originalUpdatedAt = secondImage.updatedAt;
  // 8. Reorder second image to position 0 (make it the new main thumbnail)
  const reorderedImage =
    await api.functional.ecommerceMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: secondImage.id,
        body: {
          displayOrder: 0,
        } satisfies IEcommerceMallProductImage.IUpdate,
      },
    );
  typia.assert(reorderedImage);
  // Validations
  TestValidator.equals(
    "reordered image now has displayOrder 0",
    reorderedImage.displayOrder,
    0,
  );
  TestValidator.notEquals(
    "updated_at changed after reorder",
    reorderedImage.updatedAt,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "reordered image is the second image",
    reorderedImage.id === secondImage.id,
  );
}
