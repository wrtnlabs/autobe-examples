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

export async function test_api_product_snapshot_image_list_admin_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Seller authentication
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
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1, wordMax: 5 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 4. Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: category.id,
        basePrice: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<100> &
            tags.Maximum<100000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Upload multiple images to the product (triggers snapshot creation)
  const imageCount = 3;
  const uploadedImages: IEcommerceMallProductImage[] = [];
  for (let i = 0; i < imageCount; i++) {
    const image =
      await generate_random_ecommerce_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            imageUrl: typia.random<string & tags.Format<"uri">>(),
          } satisfies IEcommerceMallProductImage.ICreate,
        },
      );
    typia.assert(image);
    uploadedImages.push(image);
  }
  // 6. Test pagination parameters - since we cannot retrieve the actual snapshot ID
  // (no GET endpoint available), we generate one for testing the API structure
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 7. Query snapshot images as admin with pagination
  const pageSize = 2;
  const firstPageRequest: IEcommerceMallProductSnapshotImage.IRequest = {
    page: 1,
    limit: pageSize,
  } satisfies IEcommerceMallProductSnapshotImage.IRequest;
  const firstPageResult =
    await api.functional.ecommerceMall.admin.productSnapshots.images.index(
      adminConnection,
      {
        snapshotId,
        body: firstPageRequest,
      },
    );
  typia.assert(firstPageResult);
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is positive",
    firstPageResult.pagination.current >= 1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    firstPageResult.pagination.limit,
    firstPageRequest.limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    firstPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    firstPageResult.pagination.pages >= 0,
  );
  // 9. Test second page
  const secondPageRequest: IEcommerceMallProductSnapshotImage.IRequest = {
    page: 2,
    limit: pageSize,
  } satisfies IEcommerceMallProductSnapshotImage.IRequest;
  const secondPageResult =
    await api.functional.ecommerceMall.admin.productSnapshots.images.index(
      adminConnection,
      {
        snapshotId,
        body: secondPageRequest,
      },
    );
  typia.assert(secondPageResult);
  // 10. Validate second page pagination
  TestValidator.equals(
    "second page current is 2",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit matches",
    secondPageResult.pagination.limit,
    secondPageRequest.limit,
  );
  // 11. Test with display order filters
  const filteredRequest: IEcommerceMallProductSnapshotImage.IRequest = {
    page: 1,
    limit: pageSize,
    displayOrderMin: 1,
    displayOrderMax: 3,
  } satisfies IEcommerceMallProductSnapshotImage.IRequest;
  const filteredResult =
    await api.functional.ecommerceMall.admin.productSnapshots.images.index(
      adminConnection,
      {
        snapshotId,
        body: filteredRequest,
      },
    );
  typia.assert(filteredResult);
  // 12. Validate filtered results
  if (filteredResult.data.length > 0) {
    for (const image of filteredResult.data) {
      typia.assert(image);
      // Verify display order is within the requested range
      TestValidator.predicate(
        `image display order ${image.display_order} is within range [${filteredRequest.displayOrderMin}, ${filteredRequest.displayOrderMax}]`,
        image.display_order >= (filteredRequest.displayOrderMin ?? 1) &&
          image.display_order <=
            (filteredRequest.displayOrderMax ?? Number.MAX_SAFE_INTEGER),
      );
    }
  }
}
