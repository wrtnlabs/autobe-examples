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

export async function test_api_product_variant_snapshot_admin_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 4. Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"double"> & tags.Minimum<0>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create variant as seller (creates initial snapshot)
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          price: typia.random<
            number & tags.Type<"double"> & tags.Minimum<0>
          >(),
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Query snapshots with createdAtFrom filter (looking back 1 day)
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const resultFrom =
    await api.functional.ecommerceMall.admin.product_variants.snapshots.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: pastDate,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(resultFrom);
  // Validate: createdAtFrom filter returns snapshots on or after date
  TestValidator.predicate(
    "createdAtFrom filter returns snapshots on or after date",
    resultFrom.data.every(
      (snapshot) =>
        new Date(snapshot.createdAt).getTime() >= new Date(pastDate).getTime(),
    ),
  );
  // 7. Query snapshots with createdAtTo filter (looking ahead 1 day)
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const resultTo =
    await api.functional.ecommerceMall.admin.product_variants.snapshots.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 10,
          createdAtTo: futureDate,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(resultTo);
  // Validate: createdAtTo filter returns snapshots on or before date
  TestValidator.predicate(
    "createdAtTo filter returns snapshots on or before date",
    resultTo.data.every(
      (snapshot) =>
        new Date(snapshot.createdAt).getTime() <=
        new Date(futureDate).getTime(),
    ),
  );
  // 8. Query snapshots with both createdAtFrom and createdAtTo filters
  const rangeFrom = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const rangeTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const resultRange =
    await api.functional.ecommerceMall.admin.product_variants.snapshots.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: rangeFrom,
          createdAtTo: rangeTo,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(resultRange);
  // Validate: Combined filters return snapshots within date range
  TestValidator.predicate(
    "Combined filters return snapshots within inclusive date range",
    resultRange.data.every((snapshot) => {
      const snapTime = new Date(snapshot.createdAt).getTime();
      const fromTime = new Date(rangeFrom).getTime();
      const toTime = new Date(rangeTo).getTime();
      return snapTime >= fromTime && snapTime <= toTime;
    }),
  );
  // Validate: Results maintain descending order by createdAt
  TestValidator.predicate(
    "Results sorted by createdAt in descending order",
    resultRange.data.every((snapshot, index, arr) => {
      if (index === 0) return true;
      const currentTime = new Date(snapshot.createdAt).getTime();
      const prevTime = new Date(arr[index - 1].createdAt).getTime();
      return currentTime <= prevTime;
    }),
  );
  // 9. Query snapshots with a date range that excludes all snapshots (should return empty)
  const farPastDate = new Date(
    Date.now() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const farPastDate2 = new Date(
    Date.now() - 364 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const resultEmpty =
    await api.functional.ecommerceMall.admin.product_variants.snapshots.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: farPastDate,
          createdAtTo: farPastDate2,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(resultEmpty);
  // Validate: Empty result when no snapshots match date criteria
  TestValidator.equals(
    "Empty result when date range excludes all snapshots",
    resultEmpty.data.length,
    0,
  );
  TestValidator.equals(
    "Empty result total count is 0",
    resultEmpty.pagination.records,
    0,
  );
}