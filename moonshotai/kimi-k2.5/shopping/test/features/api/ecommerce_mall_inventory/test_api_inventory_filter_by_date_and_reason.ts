import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_inventory_filter_by_date_and_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create product with the category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Create variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Create inventory records with different reasons
  const restockRecord =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 100,
          reason: "restock",
        },
      },
    );
  typia.assert(restockRecord);
  const adjustmentRecord =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: -10,
          reason: "inventory_adjustment",
        },
      },
    );
  typia.assert(adjustmentRecord);
  const damagedRecord =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: -5,
          reason: "damaged_goods",
        },
      },
    );
  typia.assert(damagedRecord);
  // 6. Test filtering - broad date range to capture all records
  const now = new Date();
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const futureDate = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const allRecords =
    await api.functional.ecommerceMall.variants.inventory.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          startDate: pastDate,
          endDate: futureDate,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allRecords);
  TestValidator.equals("all records count", allRecords.data.length, 3);
  TestValidator.equals(
    "pagination total records",
    allRecords.pagination.records,
    3,
  );
  // 7. Test filtering by specific reason - should only return restock record
  const restockFiltered =
    await api.functional.ecommerceMall.variants.inventory.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          startDate: pastDate,
          endDate: futureDate,
          reason: "restock",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(restockFiltered);
  TestValidator.equals(
    "restock filtered count",
    restockFiltered.data.length,
    1,
  );
  TestValidator.equals(
    "restock filtered reason",
    restockFiltered.data[0].reason,
    "restock",
  );
  TestValidator.equals(
    "restock pagination total",
    restockFiltered.pagination.records,
    1,
  );
  // 8. Test filtering by date range that excludes all records (empty result)
  const farFutureStart = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const farFutureEnd = new Date(
    now.getTime() + 366 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyResult =
    await api.functional.ecommerceMall.variants.inventory.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          startDate: farFutureStart,
          endDate: farFutureEnd,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pagination pages",
    emptyResult.pagination.pages,
    0,
  );
  // 9. Test pagination with limited page size
  const paginatedResult =
    await api.functional.ecommerceMall.variants.inventory.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          startDate: pastDate,
          endDate: futureDate,
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("paginated data length", paginatedResult.data.length, 2);
  TestValidator.equals(
    "paginated total records",
    paginatedResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "paginated current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("paginated limit", paginatedResult.pagination.limit, 2);
  // 10. Test filtering by different reason - should exclude restock records
  const adjustmentFiltered =
    await api.functional.ecommerceMall.variants.inventory.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          startDate: pastDate,
          endDate: futureDate,
          reason: "inventory_adjustment",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(adjustmentFiltered);
  TestValidator.equals(
    "adjustment filtered count",
    adjustmentFiltered.data.length,
    1,
  );
  TestValidator.equals(
    "adjustment filtered reason",
    adjustmentFiltered.data[0].reason,
    "inventory_adjustment",
  );
  TestValidator.predicate(
    "no restock in adjustment filter",
    !adjustmentFiltered.data.some((r) => r.reason === "restock"),
  );
}
