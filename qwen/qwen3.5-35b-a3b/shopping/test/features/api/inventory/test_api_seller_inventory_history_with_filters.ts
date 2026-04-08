import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_history_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerPassword123!",
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // Create product and variant (requires additional setup - using random data)
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Define date range for testing
  const today = new Date();
  const yesterday = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000);
  // Test 1: Date range filtering
  const fromDateFilter = new Date(
    today.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const toDateFilter = new Date().toISOString();
  const dateFilteredResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.history.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          search: "",
          fromDate: fromDateFilter,
          toDate: toDateFilter,
        },
      },
    );
  typia.assert(dateFilteredResponse);
  // Validate all records are within date range
  TestValidator.equals(
    "all records within date range",
    dateFilteredResponse.data.every((record) => {
      const recordDate = new Date(record.created_at);
      const fromDate = new Date(fromDateFilter);
      const toDate = new Date(toDateFilter);
      return recordDate >= fromDate && recordDate <= toDate;
    }),
    true,
  );
  // Test 2: Operation type filtering
  const restockFilteredResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.history.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          search: "",
          operationType: "RESTOCK",
        },
      },
    );
  typia.assert(restockFilteredResponse);
  // Validate all records are RESTOCK type
  TestValidator.equals(
    "all records are RESTOCK type",
    restockFilteredResponse.data.every(
      (record) => record.operation_type === "RESTOCK",
    ),
    true,
  );
  // Test 3: Quantity direction filtering (positive)
  const positiveFilteredResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.history.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          search: "",
          minQuantity: 1,
        },
      },
    );
  typia.assert(positiveFilteredResponse);
  // Validate all records have positive quantity change
  TestValidator.equals(
    "all records have positive quantity",
    positiveFilteredResponse.data.every((record) => record.quantity_change > 0),
    true,
  );
  // Test 4: Quantity range filtering
  const quantityRangeFilteredResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.history.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          search: "",
          minQuantity: 10,
          maxQuantity: 150,
        },
      },
    );
  typia.assert(quantityRangeFilteredResponse);
  // Validate all records are within quantity range
  TestValidator.equals(
    "all records within quantity range",
    quantityRangeFilteredResponse.data.every((record) => {
      return record.quantity_change >= 10 && record.quantity_change <= 150;
    }),
    true,
  );
  // Test 5: Pagination
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.history.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          search: "",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata is valid",
    () =>
      paginatedResponse.pagination.current === 1 &&
      paginatedResponse.pagination.limit === 10 &&
      paginatedResponse.pagination.records >= 0 &&
      paginatedResponse.pagination.pages >= 0,
  );
  // Validate returned records belong to the specified variant
  TestValidator.equals(
    "all records belong to variant",
    paginatedResponse.data.every(
      (record) => record.productVariant.id === variantId,
    ),
    true,
  );
}