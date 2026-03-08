import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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

/**
 * Test the primary success path for a seller viewing inventory history of their product variant.
 * 1. Seller joins and authenticates to the system
 * 2. Generate test variant ID
 * 3. Seller calls PATCH /ecommerceMall/seller/variants/{variantId}/inventory-history with pagination and filters
 * 4. Validate response structure, pagination metadata, and record format
 */
export async function test_api_seller_inventory_history_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create seller-specific connection with token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedSellerConnection.headers = {
    Authorization: seller.token.access,
  };
  // 3. Generate test variant ID (using a valid UUID)
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Test with various pagination and filter configurations
  // Test 1: Default pagination
  const defaultHistory =
    await api.functional.ecommerceMall.seller.variants.inventory_history.index(
      authenticatedSellerConnection,
      {
        variantId,
        body: {},
      },
    );
  typia.assert(defaultHistory);
  TestValidator.equals(
    "default history has pagination",
    defaultHistory.pagination,
    {
      current: 1,
      limit: 20,
      records: defaultHistory.pagination.records,
      pages: defaultHistory.pagination.pages,
    },
  );
  TestValidator.predicate(
    "default history has data array",
    Array.isArray(defaultHistory.data),
  );
  if (defaultHistory.data.length > 0) {
    // Validate record structure when records exist
    const firstRecord: IEcommerceMallInventoryRecord.ISummary =
      defaultHistory.data[0];
    typia.assert(firstRecord);
    TestValidator.predicate(
      "record has valid UUID variant_id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstRecord.variant_id,
      ),
    );
    TestValidator.predicate(
      "record has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstRecord.id,
      ),
    );
    TestValidator.predicate(
      "record has valid quantity_change",
      typeof firstRecord.quantity_change === "number",
    );
    TestValidator.predicate(
      "record has valid reason string",
      typeof firstRecord.reason === "string" && firstRecord.reason.length > 0,
    );
    TestValidator.predicate(
      "record has valid timestamp",
      !isNaN(Date.parse(firstRecord.timestamp)),
    );
  }
  // Test 2: Custom pagination
  const customPagination =
    await api.functional.ecommerceMall.seller.variants.inventory_history.index(
      authenticatedSellerConnection,
      {
        variantId,
        body: {
          pageSize: 10,
        },
      },
    );
  typia.assert(customPagination);
  TestValidator.equals(
    "custom pagination limit",
    customPagination.pagination.limit,
    10,
  );
  // Test 3: Date range filter
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date(
    now.getTime() + 1 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateFiltered =
    await api.functional.ecommerceMall.seller.variants.inventory_history.index(
      authenticatedSellerConnection,
      {
        variantId,
        body: {
          startDate,
          endDate,
        },
      },
    );
  typia.assert(dateFiltered);
  TestValidator.predicate(
    "date filtered returns paginated response",
    Array.isArray(dateFiltered.data),
  );
  // Test 4: Reason type filter
  const reasonFiltered =
    await api.functional.ecommerceMall.seller.variants.inventory_history.index(
      authenticatedSellerConnection,
      {
        variantId,
        body: {
          reasonType: "restocking",
        },
      },
    );
  typia.assert(reasonFiltered);
  TestValidator.predicate(
    "reason filtered returns paginated response",
    Array.isArray(reasonFiltered.data),
  );
  // Test 5: Sort order - ascending
  const ascSorted =
    await api.functional.ecommerceMall.seller.variants.inventory_history.index(
      authenticatedSellerConnection,
      {
        variantId,
        body: {
          sortField: "timestamp",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(ascSorted);
  TestValidator.predicate(
    "ascending sorted returns paginated response",
    Array.isArray(ascSorted.data),
  );
  // Test 6: Sort order - descending (default)
  const descSorted =
    await api.functional.ecommerceMall.seller.variants.inventory_history.index(
      authenticatedSellerConnection,
      {
        variantId,
        body: {
          sortField: "timestamp",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(descSorted);
  TestValidator.predicate(
    "descending sorted returns paginated response",
    Array.isArray(descSorted.data),
  );
  // Test 7: Maximum page size
  const maxPageSize =
    await api.functional.ecommerceMall.seller.variants.inventory_history.index(
      authenticatedSellerConnection,
      {
        variantId,
        body: {
          pageSize: 100,
        },
      },
    );
  typia.assert(maxPageSize);
  TestValidator.equals(
    "max page size limit",
    maxPageSize.pagination.limit,
    100,
  );
}