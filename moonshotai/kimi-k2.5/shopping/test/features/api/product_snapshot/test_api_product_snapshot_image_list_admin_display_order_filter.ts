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

export async function test_api_product_snapshot_image_list_admin_display_order_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 2. Create category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller authentication setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 4. Create product
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
  // 5. Upload 5 images for the product (display_order will be 0,1,2,3,4)
  const uploadedImages: IEcommerceMallProductImage[] = [];
  for (let i = 0; i < 5; i++) {
    const image =
      await generate_random_ecommerce_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
        },
      );
    typia.assert(image);
    uploadedImages.push(image);
  }
  // Sort images by display order
  const sortedImages = uploadedImages.sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  // Get the product snapshot id
  const snapshotId = product.id;
  // 6. Test filter by display order range (2-4)
  const rangeFilteredResult =
    await api.functional.ecommerceMall.admin.productSnapshots.images.index(
      adminConnection,
      {
        snapshotId: snapshotId,
        body: {
          displayOrderMin: 2,
          displayOrderMax: 4,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(rangeFilteredResult);
  // 7. Validate filtered results
  TestValidator.equals(
    "filtered result records count",
    rangeFilteredResult.pagination.records,
    3,
  );
  TestValidator.predicate("all filtered items within range", () =>
    rangeFilteredResult.data.every(
      (img) => img.display_order >= 2 && img.display_order <= 4,
    ),
  );
  // 8. Test pagination with filtered results
  const paginatedResult =
    await api.functional.ecommerceMall.admin.productSnapshots.images.index(
      adminConnection,
      {
        snapshotId: snapshotId,
        body: {
          displayOrderMin: 1,
          displayOrderMax: 5,
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "paginated limit respects limit parameter",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "paginated data length respects limit",
    () => paginatedResult.data.length <= 2,
  );
  // 9. Test edge case: empty range (requesting range beyond available images)
  const emptyRangeResult =
    await api.functional.ecommerceMall.admin.productSnapshots.images.index(
      adminConnection,
      {
        snapshotId: snapshotId,
        body: {
          displayOrderMin: 10,
          displayOrderMax: 20,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(emptyRangeResult);
  TestValidator.equals(
    "empty range returns zero records",
    emptyRangeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty range returns zero pages",
    emptyRangeResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty range returns empty data array",
    emptyRangeResult.data.length,
    0,
  );
  // 10. Test single value filter (min=max)
  const singleValueResult =
    await api.functional.ecommerceMall.admin.productSnapshots.images.index(
      adminConnection,
      {
        snapshotId: snapshotId,
        body: {
          displayOrderMin: 1,
          displayOrderMax: 1,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(singleValueResult);
  TestValidator.equals(
    "single value filter returns one record at most",
    singleValueResult.pagination.records,
    1,
  );
  if (singleValueResult.data.length > 0) {
    TestValidator.equals(
      "single value filter returns correct display order",
      singleValueResult.data[0].display_order,
      1,
    );
  }
}
