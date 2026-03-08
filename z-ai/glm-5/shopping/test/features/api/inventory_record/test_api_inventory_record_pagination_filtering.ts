import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_record_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // ========================
  // Setup: Administrator
  // ========================
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // ========================
  // Setup: Category
  // ========================
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // ========================
  // Setup: Seller
  // ========================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // ========================
  // Setup: Product
  // ========================
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // ========================
  // Setup: Variant
  // ========================
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`.toUpperCase(),
          optionValues: {
            color: RandomGenerator.pick(["Red", "Blue", "Green", "Black"]),
            size: RandomGenerator.pick(["S", "M", "L", "XL"]),
          },
          price: null,
        },
      },
    );
  typia.assert(variant);
  // ========================
  // Test: Pagination - Basic Query
  // ========================
  const page1Result =
    await api.functional.shoppingMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page1Result);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination.current equals 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit equals 5",
    page1Result.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    page1Result.pagination.pages >= 0,
  );
  TestValidator.predicate("data length <= limit", page1Result.data.length <= 5);
  // ========================
  // Test: Pagination - Page 2 (if applicable)
  // ========================
  if (page1Result.pagination.pages > 1) {
    const page2Result =
      await api.functional.shoppingMall.seller.variants.inventory_records.index(
        sellerConnection,
        {
          variantId: variant.id,
          body: {
            page: 2,
            limit: 5,
          } satisfies IShoppingMallInventoryRecord.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2Result.pagination.limit, 5);
    // Verify different records on page 2
    if (page1Result.data.length > 0 && page2Result.data.length > 0) {
      TestValidator.notEquals(
        "different records on different pages",
        page1Result.data[0].id,
        page2Result.data[0].id,
      );
    }
  }
  // ========================
  // Test: Filtering - Sort Oldest
  // ========================
  const oldestResult =
    await api.functional.shoppingMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          sort: "oldest",
          limit: 100,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(oldestResult);
  // Verify ascending order by created_at
  if (oldestResult.data.length >= 2) {
    for (let i = 0; i < oldestResult.data.length - 1; i++) {
      TestValidator.predicate(
        "oldest sort - ascending order",
        new Date(oldestResult.data[i].createdAt) <=
          new Date(oldestResult.data[i + 1].createdAt),
      );
    }
  }
  // ========================
  // Test: Filtering - Sort Newest (Default)
  // ========================
  const newestResult =
    await api.functional.shoppingMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          sort: "newest",
          limit: 100,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(newestResult);
  // Verify descending order by created_at
  if (newestResult.data.length >= 2) {
    for (let i = 0; i < newestResult.data.length - 1; i++) {
      TestValidator.predicate(
        "newest sort - descending order",
        new Date(newestResult.data[i].createdAt) >=
          new Date(newestResult.data[i + 1].createdAt),
      );
    }
  }
  // ========================
  // Test: Filtering - By Source 'manual'
  // ========================
  const manualResult =
    await api.functional.shoppingMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          source: "manual",
          limit: 100,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(manualResult);
  // Verify all returned records are manual adjustments
  for (const record of manualResult.data) {
    TestValidator.predicate(
      "manual record has seller reference",
      record.seller !== null,
    );
    TestValidator.equals(
      "manual record has no order reference",
      record.order,
      null,
    );
    TestValidator.equals(
      "manual record has no cancellation reference",
      record.cancellationRequest,
      null,
    );
    TestValidator.equals(
      "manual record has no refund reference",
      record.refundRequest,
      null,
    );
  }
  // ========================
  // Test: Filtering - Search by Reason
  // ========================
  // First, get all records to find a reason to search for
  const allRecords =
    await api.functional.shoppingMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          limit: 100,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allRecords);
  // If there are records with reasons, test search functionality
  if (allRecords.data.length > 0 && allRecords.data[0].reason) {
    const searchReason = allRecords.data[0].reason.substring(0, 5);
    const searchResult =
      await api.functional.shoppingMall.seller.variants.inventory_records.index(
        sellerConnection,
        {
          variantId: variant.id,
          body: {
            search: searchReason,
            limit: 100,
          } satisfies IShoppingMallInventoryRecord.IRequest,
        },
      );
    typia.assert(searchResult);
    // Verify all returned records contain the search term in reason
    for (const record of searchResult.data) {
      TestValidator.predicate(
        "search result contains search term",
        record.reason.toLowerCase().includes(searchReason.toLowerCase()),
      );
    }
  }
  // ========================
  // Test: Filtering - Combined Filters
  // ========================
  const combinedResult =
    await api.functional.shoppingMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          source: "manual",
          sort: "newest",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Verify combined filters work correctly
  TestValidator.equals(
    "combined pagination.current",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "combined data length <= limit",
    combinedResult.data.length <= 10,
  );
  // Verify all records are manual and sorted by newest
  for (const record of combinedResult.data) {
    TestValidator.predicate(
      "combined filter - manual record has seller",
      record.seller !== null,
    );
  }
}
