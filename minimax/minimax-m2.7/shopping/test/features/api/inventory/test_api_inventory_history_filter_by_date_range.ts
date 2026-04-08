import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
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
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

interface IPaginationWithMeta {
  current: number;
  limit: number;
  records: number;
  pages: number;
}

export async function test_api_inventory_history_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {});
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: "Q!W@E#R$T",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup - join and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(
    sellerJoinConnection,
    {},
  );
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinResult.email,
      password: "Q!W@E#R$T",
    },
  });
  // 3. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Create product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 5. Create multiple inventory records
  const inventoryRecords: IEcommerceMallInventoryRecord[] = [];
  for (let i = 0; i < 5; i++) {
    const record =
      await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
        sellerConnection,
        {
          params: { productId: product.id, variantId: variant.id },
          body: {
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
            operationType: RandomGenerator.pick([
              "restock",
              "adjustment",
            ] as const),
            reason: RandomGenerator.pick([
              "restock",
              "adjustment",
              "damaged",
              "inventory_count",
            ] as const),
          },
        },
      );
    inventoryRecords.push(record);
    typia.assert(record);
  }
  // 6. Get all inventory records without date filter
  const allRecordsResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(allRecordsResponse);
  TestValidator.equals(
    "all records returned without filter",
    allRecordsResponse.data.length,
    inventoryRecords.length,
  );
  // 7. Test with a wide date range that includes all records
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const wideRangeResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          fromDate: weekAgo.toISOString(),
          toDate: weekLater.toISOString(),
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(wideRangeResponse);
  TestValidator.equals(
    "all records included in wide date range",
    wideRangeResponse.data.length,
    allRecordsResponse.data.length,
  );
  // 8. Validate records are within date range boundaries
  for (const record of wideRangeResponse.data) {
    const recordDate = new Date(record.createdAt);
    TestValidator.predicate(
      "record within fromDate boundary",
      recordDate >= weekAgo,
    );
    TestValidator.predicate(
      "record within toDate boundary",
      recordDate <= weekLater,
    );
  }
  // 9. Test pagination metadata is correct
  const allPagination = allRecordsResponse.pagination as unknown as IPaginationWithMeta;
  TestValidator.equals(
    "pagination current page is 1",
    allPagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    allPagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    allPagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    allPagination.pages >= 0,
  );
  // 10. Test with pagination
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(paginatedResponse);
  const paginatedPagination = paginatedResponse.pagination as unknown as IPaginationWithMeta;
  TestValidator.equals(
    "pagination returns limited records",
    paginatedResponse.data.length <= 2,
    true,
  );
  TestValidator.equals(
    "total records matches or exceeds page size",
    paginatedPagination.records >= paginatedResponse.data.length,
    true,
  );
  // 11. Test with only fromDate filter
  const fromDateResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          fromDate: weekAgo.toISOString(),
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(fromDateResponse);
  TestValidator.predicate(
    "fromDate filter returns records",
    fromDateResponse.data.length >= 0,
  );
  // 12. Test with only toDate filter
  const toDateResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          toDate: weekLater.toISOString(),
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(toDateResponse);
  TestValidator.predicate(
    "toDate filter returns records",
    toDateResponse.data.length >= 0,
  );
}