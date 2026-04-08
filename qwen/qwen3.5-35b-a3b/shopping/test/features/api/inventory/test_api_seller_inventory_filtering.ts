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

export async function test_api_seller_inventory_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create product and variant - simulate with random UUIDs
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test filtering by operation_type
  const opTypeFilter =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          operationType: "RESTOCK",
          search: null,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(opTypeFilter);
  TestValidator.equals(
    "operation type filter",
    opTypeFilter.pagination.records,
    0,
  );
  // 3. Test filtering by date range
  const dateRangeFilter =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          fromDate: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 30 days ago
          toDate: new Date().toISOString(),
          search: null,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  TestValidator.equals(
    "date range filter",
    dateRangeFilter.pagination.records,
    0,
  );
  // 4. Test filtering by quantity range
  const quantityRangeFilter =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          minQuantity: -100,
          maxQuantity: 500,
          search: null,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(quantityRangeFilter);
  TestValidator.equals(
    "quantity range filter",
    quantityRangeFilter.pagination.records,
    0,
  );
  // 5. Test keyword search in notes
  const keywordSearch =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          search: "test",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(keywordSearch);
  TestValidator.equals(
    "keyword search filter",
    keywordSearch.pagination.records,
    0,
  );
  // 6. Test pagination with limit
  const pagination =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          limit: 10,
          search: null,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(pagination);
  TestValidator.equals("pagination limit", pagination.pagination.limit, 10);
  // 7. Test sorting
  const sorted =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          sortBy: "quantity_change",
          sortOrder: "desc",
          search: null,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(sorted);
}
