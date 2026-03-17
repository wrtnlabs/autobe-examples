import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_product_snapshot_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection and create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Setup seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Create product (generates initial snapshot)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // Record the creation time for date range testing
  const productCreatedAt = new Date(product.createdAt);
  const beforeCreation = new Date(productCreatedAt.getTime() - 86400000); // 1 day before
  const afterCreation = new Date(productCreatedAt.getTime() + 86400000); // 1 day after
  // 4. Test snapshots without date filter (should return at least 1)
  const allSnapshots =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "should have at least one snapshot",
    allSnapshots.data.length >= 1,
  );
  // 5. Test date range filter including the snapshot (should return results)
  const filteredSnapshots =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          created_at_from: beforeCreation.toISOString(),
          created_at_to: afterCreation.toISOString(),
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  TestValidator.predicate(
    "date range including snapshot should return results",
    filteredSnapshots.data.length >= 1,
  );
  // Verify all returned snapshots are within the date range
  for (const snapshot of filteredSnapshots.data) {
    const snapshotDate = new Date(snapshot.createdAt);
    TestValidator.predicate(
      "snapshot should be within date range",
      snapshotDate >= beforeCreation && snapshotDate <= afterCreation,
    );
  }
  // 6. Test date range excluding the snapshot (future dates - should return empty)
  const futureDate = new Date(productCreatedAt.getTime() + 86400000 * 30); // 30 days after
  const farFutureDate = new Date(productCreatedAt.getTime() + 86400000 * 60); // 60 days after
  const emptySnapshots =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          created_at_from: futureDate.toISOString(),
          created_at_to: farFutureDate.toISOString(),
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(emptySnapshots);
  TestValidator.equals(
    "future date range should return empty results",
    emptySnapshots.data.length,
    0,
  );
  // 7. Test date range in the past (should return empty)
  const pastDate = new Date(productCreatedAt.getTime() - 86400000 * 60); // 60 days before
  const beforePastDate = new Date(productCreatedAt.getTime() - 86400000 * 30); // 30 days before
  const pastSnapshots =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          created_at_from: pastDate.toISOString(),
          created_at_to: beforePastDate.toISOString(),
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(pastSnapshots);
  TestValidator.equals(
    "past date range should return empty results",
    pastSnapshots.data.length,
    0,
  );
  // 8. Test pagination with date filters
  const paginatedRequest: IEcommerceMallProductSnapshot.IRequest = {
    created_at_from: beforeCreation.toISOString(),
    created_at_to: afterCreation.toISOString(),
    limit: 10,
    page: 1,
  };
  const paginatedSnapshots =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: paginatedRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "pagination should work with date filters",
    paginatedSnapshots.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    paginatedSnapshots.pagination.current,
    1,
  );
  // 9. Test only created_at_from (open-ended end date)
  const fromOnlySnapshots =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          created_at_from: beforeCreation.toISOString(),
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(fromOnlySnapshots);
  TestValidator.predicate(
    "created_at_from only should return results",
    fromOnlySnapshots.data.length >= 1,
  );
  // 10. Test only created_at_to (open-ended start date)
  const toOnlySnapshots =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          created_at_to: afterCreation.toISOString(),
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(toOnlySnapshots);
  TestValidator.predicate(
    "created_at_to only should return results",
    toOnlySnapshots.data.length >= 1,
  );
}
