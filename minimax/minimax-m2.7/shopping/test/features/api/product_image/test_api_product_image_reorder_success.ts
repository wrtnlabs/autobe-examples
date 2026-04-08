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

/**
 * Test successful reordering of product images by seller.
 *
 * Steps:
 * 1. Authenticate as seller via POST /ecommerceMall/auth/seller/join
 * 2. Create admin and category via POST /ecommerceMall/admin/categories
 * 3. Create product via POST /ecommerceMall/seller/products
 * 4. Upload 3 images via POST /ecommerceMall/seller/products/{productId}/images
 * 5. Reorder images with new display_order values via PATCH
 * 6. Verify response returns images ordered by display_order (0, 1, 2)
 */
export async function test_api_product_image_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 2. Create admin for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: "Q!W@E3R4" satisfies string & tags.Format<"password">,
      href: "http://localhost:3000" satisfies string & tags.Format<"uri">,
      referrer:
        "http://localhost:3000" satisfies string & tags.Format<"uri">,
    },
  });
  // 3. Create category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 4. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Upload 3 images
  const image1 = await generate_random_ecommerce_mall_seller_products_images_create(
    sellerConnection,
    {
      body: {
        imageUrl:
          `https://example.com/images/product1-img1.jpg` as string &
          tags.Format<"uri">,
      },
      params: { productId: product.id },
    },
  );
  typia.assert(image1);
  const image2 = await generate_random_ecommerce_mall_seller_products_images_create(
    sellerConnection,
    {
      body: {
        imageUrl:
          `https://example.com/images/product1-img2.jpg` as string &
          tags.Format<"uri">,
      },
      params: { productId: product.id },
    },
  );
  typia.assert(image2);
  const image3 = await generate_random_ecommerce_mall_seller_products_images_create(
    sellerConnection,
    {
      body: {
        imageUrl:
          `https://example.com/images/product1-img3.jpg` as string &
          tags.Format<"uri">,
      },
      params: { productId: product.id },
    },
  );
  typia.assert(image3);
  // Verify initial order: image1=0, image2=1, image3=2
  TestValidator.equals("image1 displayOrder", image1.displayOrder, 0);
  TestValidator.equals("image2 displayOrder", image2.displayOrder, 1);
  TestValidator.equals("image3 displayOrder", image3.displayOrder, 2);
  // 6. Reorder images:
  // - image at position 0 (image1) moves to position 2
  // - image at position 1 (image2) moves to position 0
  // - image at position 2 (image3) moves to position 1
  // New order: image2(0), image3(1), image1(2)
  const reorderResponse =
    await api.functional.ecommerceMall.seller.products.images.reorder(
      sellerConnection,
      {
        productId: product.id,
        body: {
          items: [
            {
              imageId: image2.id,
              displayOrder: 0 satisfies number &
                tags.Type<"int32"> &
                tags.Minimum<0>,
            },
            {
              imageId: image3.id,
              displayOrder: 1 satisfies number &
                tags.Type<"int32"> &
                tags.Minimum<0>,
            },
            {
              imageId: image1.id,
              displayOrder: 2 satisfies number &
                tags.Type<"int32"> &
                tags.Minimum<0>,
            },
          ] satisfies IEcommerceMallProductImage.IReorderItem[],
        },
      },
    );
  typia.assert(reorderResponse);
  // 7. Validate response - images should be ordered by display_order (0, 1, 2)
  TestValidator.equals(
    "images array has 3 items",
    reorderResponse.images.length,
    3,
  );
  const reorderedImage1 = reorderResponse.images.find(
    (img) => img.id === image1.id,
  );
  const reorderedImage2 = reorderResponse.images.find(
    (img) => img.id === image2.id,
  );
  const reorderedImage3 = reorderResponse.images.find(
    (img) => img.id === image3.id,
  );
  TestValidator.notEquals("image1 found", reorderedImage1, null);
  TestValidator.notEquals("image2 found", reorderedImage2, null);
  TestValidator.notEquals("image3 found", reorderedImage3, null);
  // Verify new display order: image2=0, image3=1, image1=2
  TestValidator.equals(
    "reordered image2 displayOrder",
    reorderedImage2!.displayOrder,
    0,
  );
  TestValidator.equals(
    "reordered image3 displayOrder",
    reorderedImage3!.displayOrder,
    1,
  );
  TestValidator.equals(
    "reordered image1 displayOrder",
    reorderedImage1!.displayOrder,
    2,
  );
  // Verify images are in correct order by displayOrder
  TestValidator.equals(
    "first image has displayOrder 0",
    reorderResponse.images[0].displayOrder,
    0,
  );
  TestValidator.equals(
    "second image has displayOrder 1",
    reorderResponse.images[1].displayOrder,
    1,
  );
  TestValidator.equals(
    "third image has displayOrder 2",
    reorderResponse.images[2].displayOrder,
    2,
  );
}
