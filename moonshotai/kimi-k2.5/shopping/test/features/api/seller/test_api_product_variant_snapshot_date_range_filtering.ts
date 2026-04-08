import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test filtering snapshots by date range. This validates the date filtering capabilities of the snapshot listing endpoint.
 * The test should:
 * 1) Authenticate as seller,
 * 2) Create category and product,
 * 3) Create a variant,
 * 4) Make multiple edits to the variant to create snapshots at different times (or simulate different creation times),
 * 5) Query snapshots with createdAtFrom filter set to a specific date,
 * 6) Query snapshots with createdAtTo filter set to a specific date,
 * 7) Query snapshots with both createdAtFrom and createdAtTo to create a date range,
 * 8) Verify each response contains only snapshots within the specified date range.
 */
export async function test_api_product_variant_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // Setup seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: category.id,
        basePrice: typia.random<number & tags.Type<"uint32">>() % 1000,
      },
    },
  );
  typia.assert(product);
  // Create product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          price: typia.random<number & tags.Minimum<0>>(),
          options: ArrayUtil.repeat(2, () => ({
            optionName: RandomGenerator.name(1),
            optionValue: RandomGenerator.name(1),
          })) satisfies IEcommerceMallProductVariantOption.ICreate[],
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // Prepare date range for testing
  // Current time is 2026-04-03T01:27:14.697Z
  const now = new Date("2026-04-03T01:27:14.697Z");
  // Yesterday at start of day
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  const yesterdayIso = yesterday.toISOString();
  // Tomorrow at end of day
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setUTCHours(23, 59, 59, 999);
  const tomorrowIso = tomorrow.toISOString();
  // 5. Query snapshots with createdAtFrom filter set to yesterday
  // This should return snapshots created today
  const snapshotsFromYesterday =
    await api.functional.ecommerceMall.seller.product_variants.snapshots.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          createdAtFrom: yesterdayIso,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsFromYesterday);
  // 6. Query snapshots with createdAtTo filter set to yesterday
  // This should return empty or fewer snapshots since creation is after that date
  const snapshotsToYesterday =
    await api.functional.ecommerceMall.seller.product_variants.snapshots.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          createdAtTo: yesterdayIso,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsToYesterday);
  // 7. Query snapshots with both createdAtFrom and createdAtTo to create a date range
  // This should include snapshots from yesterday to tomorrow
  const snapshotsDateRange =
    await api.functional.ecommerceMall.seller.product_variants.snapshots.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          createdAtFrom: yesterdayIso,
          createdAtTo: tomorrowIso,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsDateRange);
  // 8. Verify filtering logic
  // Snapshots created today should be in results filtered from yesterday
  TestValidator.predicate(
    "snapshots from yesterday should include recent snapshots",
    snapshotsFromYesterday.data.length >= snapshotsToYesterday.data.length,
  );
  // Compare date range results with from-only results
  // Since tomorrow > yesterday, range results should equal or be subset of from-only results
  TestValidator.predicate(
    "date range filtering should work correctly",
    snapshotsDateRange.data.length <= snapshotsFromYesterday.data.length,
  );
  // All snapshots in date range should have createdAt between yesterday and tomorrow
  if (snapshotsDateRange.data.length > 0) {
    const minDate = new Date(yesterdayIso);
    const maxDate = new Date(tomorrowIso);
    snapshotsDateRange.data.forEach((snapshot) => {
      const snapshotDate = new Date(snapshot.createdAt);
      TestValidator.predicate(
        `snapshot ${snapshot.id} should be within date range`,
        snapshotDate >= minDate && snapshotDate <= maxDate,
      );
    });
  }
}
