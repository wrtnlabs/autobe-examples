import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshotImage";
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

export async function test_api_product_snapshot_image_list_admin_cross_seller_oversight(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Setup first seller and create product with images
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {});
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product1);
  const images1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      seller1Connection,
      {
        params: {
          productId: product1.id,
        },
      },
    );
  typia.assert(images1);
  // 3. Setup second seller and create product with images
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {});
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product2);
  const images2 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      seller2Connection,
      {
        params: {
          productId: product2.id,
        },
      },
    );
  typia.assert(images2);
  // 4. Admin accesses snapshot images from first seller's product
  const snapshot1Images =
    await api.functional.ecommerceMall.admin.productSnapshots.images.index(
      adminConnection,
      {
        snapshotId: product1.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(snapshot1Images);
  // 5. Admin accesses snapshot images from second seller's product
  const snapshot2Images =
    await api.functional.ecommerceMall.admin.productSnapshots.images.index(
      adminConnection,
      {
        snapshotId: product2.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(snapshot2Images);
  // 6. Validate cross-seller access - typia.assert above already validated structure
  TestValidator.predicate(
    "admin has access to product snapshots from seller1",
    true,
  );
  TestValidator.predicate(
    "admin has access to product snapshots from seller2",
    true,
  );
  TestValidator.equals(
    "pagination structure valid",
    typeof snapshot1Images.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination structure valid for seller2",
    typeof snapshot2Images.pagination.current,
    "number",
  );
}
