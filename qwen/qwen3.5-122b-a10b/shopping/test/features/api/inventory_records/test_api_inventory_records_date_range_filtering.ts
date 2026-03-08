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

export async function test_api_inventory_records_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Login as admin
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Authenticate as seller
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Login as seller
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.seller.email,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Create category (admin)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 4. Create product (seller)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create variant (seller) - this creates initial inventory record
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [
            { key: "color", value: RandomGenerator.alphabets(5) },
          ] satisfies IEcommerceMallProductVariantOption[],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Get all inventory records for the variant
  const allRecords =
    await api.functional.ecommerceMall.admin.variants.inventory_records.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {},
      },
    );
  typia.assert(allRecords);
  // 7. Define date range for filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7); // 7 days ago
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7); // 7 days from now
  // 8. Query with date range filter (past to now)
  const filteredRecords =
    await api.functional.ecommerceMall.admin.variants.inventory_records.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          recorded_at_from: pastDate.toISOString(),
          recorded_at_to: now.toISOString(),
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(filteredRecords);
  // 9. Verify all returned records are within the date range
  for (const record of filteredRecords.data) {
    const recordDate = new Date(record.recorded_at);
    TestValidator.predicate(
      "record date >= recorded_at_from",
      recordDate >= pastDate,
    );
    TestValidator.predicate("record date <= recorded_at_to", recordDate <= now);
  }
  // 10. Verify pagination metadata
  TestValidator.equals(
    "filtered record count matches data length",
    filteredRecords.pagination.records,
    filteredRecords.data.length,
  );
  // 11. Test empty range (future date range with no records)
  const futureRecords =
    await api.functional.ecommerceMall.admin.variants.inventory_records.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          recorded_at_from: futureDate.toISOString(),
          recorded_at_to: new Date(
            futureDate.getTime() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(futureRecords);
  TestValidator.equals(
    "future range has no records",
    futureRecords.pagination.records,
    0,
  );
  TestValidator.equals(
    "future range data is empty",
    futureRecords.data.length,
    0,
  );
  // 12. Test that records outside range are excluded
  // Get all records without date filter
  const unrestrictedRecords =
    await api.functional.ecommerceMall.admin.variants.inventory_records.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {},
      },
    );
  typia.assert(unrestrictedRecords);
  // Count records that should be in the filtered range
  const expectedCount = unrestrictedRecords.data.filter((record) => {
    const recordDate = new Date(record.recorded_at);
    return recordDate >= pastDate && recordDate <= now;
  }).length;
  TestValidator.equals(
    "filtered count matches expected count from unrestricted query",
    filteredRecords.pagination.records,
    expectedCount,
  );
}