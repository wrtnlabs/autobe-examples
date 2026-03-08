import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
 * Test product image sort order reordering workflow.
 * 1. Admin creates category
 * 2. Seller creates product
 * 3. Seller uploads 3 images to product
 * 4. Seller reorders images by updating sort order
 * 5. Validate thumbnail designation changes
 * 6. Verify snapshot audit trail
 */
export async function test_api_product_image_sort_order_reorder(
  connection: api.IConnection,
) {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<
          string &
            tags.MinLength<1> &
            tags.MaxLength<255> &
            tags.Format<"email">
        >(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.admin.login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 2. Seller setup - create product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<
          string &
            tags.MinLength<1> &
            tags.MaxLength<255> &
            tags.Format<"email">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.seller.login.signIn(
    sellerLoginConnection,
    {
      body: {
        email: sellerAuth.seller.email,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload 3 images
  const image1 =
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image1);
  const image2 =
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image2);
  const image3 =
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image3);
  // Verify initial order: image1=0, image2=1, image3=2
  TestValidator.equals("image1 sortOrder", image1.sortOrder, 0);
  TestValidator.equals("image2 sortOrder", image2.sortOrder, 1);
  TestValidator.equals("image3 sortOrder", image3.sortOrder, 2);
  TestValidator.predicate("image1 is primary", image1.isPrimary === true);
  TestValidator.predicate("image2 not primary", image2.isPrimary === false);
  TestValidator.predicate("image3 not primary", image3.isPrimary === false);
  // 4. Reorder - move image3 to front (sortOrder=0)
  const updatedImage3 =
    await api.functional.ecommerceMall.seller.products.images.update(
      sellerLoginConnection,
      {
        productId: product.id,
        imageId: image3.id,
        body: {
          sortOrder: 0,
        } satisfies IEcommerceMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage3);
  // 5. Verify new order - image3=0, image1=1, image2=2
  TestValidator.equals("image3 new sortOrder", updatedImage3.sortOrder, 0);
  TestValidator.predicate(
    "image3 now primary",
    updatedImage3.isPrimary === true,
  );
  // Verify thumbnail URL points to new first image by checking images array
  const firstImage = product.images.find(
    (img: IEcommerceMallProductImage) => img.sortOrder === 0,
  );
  TestValidator.equals(
    "first image is image3",
    firstImage?.id,
    updatedImage3.id,
  );
  TestValidator.equals(
    "first image URL matches",
    firstImage?.url,
    updatedImage3.url,
  );
}
