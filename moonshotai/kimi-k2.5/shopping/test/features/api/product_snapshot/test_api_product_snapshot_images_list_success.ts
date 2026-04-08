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
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_snapshot_images_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin for category creation
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoined = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoined);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoined.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentId: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Create and authenticate seller
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoined = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoined);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoined.email,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Create product as seller (automatically generates a snapshot)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Verify product has images for the snapshot
  TestValidator.predicate(
    "product should have images",
    product.images.length > 0,
  );
  // Get the snapshot ID from the product snapshots array
  // The product should have a snapshots property containing product snapshots
  const snapshotId: string | undefined = (product as any).snapshots?.[0]?.id;
  typia.assertGuard<string>(snapshotId);
  // 5. Call the API to list snapshot images with default pagination (empty request body)
  const response =
    await api.functional.ecommerceMall.seller.productSnapshots.images.index(
      sellerConnection,
      {
        snapshotId,
        body: {} satisfies IEcommerceMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(response);
  // 6. Validate pagination structure
  TestValidator.predicate(
    "pagination should have current page",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records should match total image count",
    response.pagination.records,
    product.images.length,
  );
  TestValidator.predicate(
    "pagination should have pages >= 0",
    response.pagination.pages >= 0,
  );
  // 7. Validate image data
  TestValidator.predicate(
    "data array should not be empty",
    response.data.length > 0,
  );
  TestValidator.equals(
    "data count should match records",
    response.data.length,
    response.pagination.records,
  );
  // Validate image properties and sorting by display_order
  let previousDisplayOrder = 0;
  for (const image of response.data) {
    typia.assert(image);
    TestValidator.predicate(
      "image id should be valid uuid",
      typia.is<string & tags.Format<"uuid">>(image.id),
    );
    TestValidator.predicate(
      "image url should be valid uri",
      typia.is<string & tags.Format<"uri">>(image.url),
    );
    TestValidator.predicate(
      "image display_order should be >= 1",
      image.display_order >= 1,
    );
    TestValidator.predicate(
      "images should be sorted by display_order ascending",
      image.display_order > previousDisplayOrder,
    );
    TestValidator.predicate(
      "image created_at should be valid date-time",
      typia.is<string & tags.Format<"date-time">>(image.created_at),
    );
    previousDisplayOrder = image.display_order;
  }
}