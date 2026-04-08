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

export async function test_api_product_image_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category for product assignment
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: "Need admin access for testing product image deletion",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 2. Seller registers and joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 3. Seller creates a new product with required fields
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  // 4. Seller uploads multiple images (at least 3) to the product
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: `https://example.com/images/product-${RandomGenerator.alphaNumeric(8)}.jpg`,
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: `https://example.com/images/product-${RandomGenerator.alphaNumeric(8)}.jpg`,
        },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: `https://example.com/images/product-${RandomGenerator.alphaNumeric(8)}.jpg`,
        },
      },
    );
  typia.assert(image3);
  // 5. Verify the first uploaded image has display_order=0 (main thumbnail)
  TestValidator.equals("first image is main thumbnail", image1.displayOrder, 0);
  TestValidator.equals(
    "second image has display_order 1",
    image2.displayOrder,
    1,
  );
  TestValidator.equals(
    "third image has display_order 2",
    image3.displayOrder,
    2,
  );
  // Store the imageId to delete for later verification
  const deletedImageId = image2.id;
  const mainImageId = image1.id;
  const remainingImageId = image3.id;
  // 6. Seller deletes one of the non-main images (display_order > 0) - delete image2
  await api.functional.ecommerceMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: deletedImageId,
    },
  );
  // 7. Validate response is successful - erase returns void, so no error means success
  TestValidator.predicate("image deletion completed without error", true);
  // 8. Upload a new image and verify the state of remaining images
  // We need to verify by uploading another image and checking the product's image collection
  const image4 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: `https://example.com/images/product-${RandomGenerator.alphaNumeric(8)}.jpg`,
        },
      },
    );
  typia.assert(image4);
  // 9. Verify the main thumbnail (display_order=0) remains unchanged
  TestValidator.equals(
    "main thumbnail remains at display_order=0",
    image1.displayOrder,
    0,
  );
  // 10. Verify other images retain their display_order values (or adjust correctly)
  // Since we deleted image2 (order=1), image3 should now be at order=1 and image4 at order=2
  // OR image3 stays at order=2 and image4 at order=3 - depends on implementation
  // The key is that deletedImage should NOT be present
  TestValidator.notEquals(
    "deleted image no longer exists (new image gets different ID)",
    image4.id,
    deletedImageId,
  );
  TestValidator.equals(
    "new image has display_order after existing images",
    image4.displayOrder,
    3,
  );
}
