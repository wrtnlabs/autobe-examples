import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
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
 * Test inventory history for seller with no inventory records.
 *
 * This test validates the inventory history endpoint behavior for a newly
 * registered seller who has no products, variants, or inventory records.
 *
 * Steps:
 * 1. Register new seller via join endpoint
 * 2. Query inventory history with default parameters (no filters)
 * 3. Verify response is valid paginated result with empty data array
 * 4. Verify pagination metadata shows records=0, pages=0
 * 5. Query with various filter combinations (variantId, date range, reason)
 * 6. Verify all return empty results for seller with no products/variants
 * 7. Test boundary pagination values: page=1, limit=100 (max)
 * 8. Validate response schema matches IPageIEcommerceMallInventoryRecord.ISummary
 * 9. Verify timestamps are in ISO 8601 date-time format
 */
export async function test_api_inventory_history_empty_for_new_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Query inventory history with default parameters (no filters)
  const defaultResponse =
    await api.functional.ecommerceMall.seller.inventory_history.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // 3. Verify response is valid paginated result with empty data array
  TestValidator.equals("data array is empty", defaultResponse.data.length, 0);
  // 4. Verify pagination metadata shows records=0, pages=0
  TestValidator.equals(
    "records count is 0",
    defaultResponse.pagination.records,
    0,
  );
  TestValidator.equals("pages count is 0", defaultResponse.pagination.pages, 0);
  TestValidator.equals(
    "current page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is default 20",
    defaultResponse.pagination.limit,
    20,
  );
  // 5. Query with various filter combinations (all should return empty)
  // Filter by non-existent variantId
  const variantFilterResponse =
    await api.functional.ecommerceMall.seller.inventory_history.index(
      sellerConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(variantFilterResponse);
  TestValidator.equals(
    "variant filter returns empty",
    variantFilterResponse.data.length,
    0,
  );
  // Filter by date range
  const dateRangeResponse =
    await api.functional.ecommerceMall.seller.inventory_history.index(
      sellerConnection,
      {
        body: {
          startDate: "2020-01-01T00:00:00.000Z" as string &
            tags.Format<"date-time">,
          endDate: "2030-12-31T23:59:59.999Z" as string &
            tags.Format<"date-time">,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  TestValidator.equals(
    "date range filter returns empty",
    dateRangeResponse.data.length,
    0,
  );
  // Filter by reason
  const reasonFilterResponse =
    await api.functional.ecommerceMall.seller.inventory_history.index(
      sellerConnection,
      {
        body: {
          reason: "restock",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(reasonFilterResponse);
  TestValidator.equals(
    "reason filter returns empty",
    reasonFilterResponse.data.length,
    0,
  );
  // Combined filters (variantId + date range + reason)
  const combinedFilterResponse =
    await api.functional.ecommerceMall.seller.inventory_history.index(
      sellerConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          startDate: "2020-01-01T00:00:00.000Z" as string &
            tags.Format<"date-time">,
          endDate: "2030-12-31T23:59:59.999Z" as string &
            tags.Format<"date-time">,
          reason: "order_placement",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  TestValidator.equals(
    "combined filters return empty",
    combinedFilterResponse.data.length,
    0,
  );
  // 6. Test boundary pagination values: page=1, limit=100 (max)
  const maxLimitResponse =
    await api.functional.ecommerceMall.seller.inventory_history.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "limit accepts max value 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.equals("page 1 returns empty", maxLimitResponse.data.length, 0);
  // Test page 2 when no data
  const page2Response =
    await api.functional.ecommerceMall.seller.inventory_history.index(
      sellerConnection,
      {
        body: {
          page: 2,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2 returns empty", page2Response.data.length, 0);
  // 7. Validate response schema matches IPageIEcommerceMallInventoryRecord.ISummary
  // The typia.assert() above already validated the schema
  // Verify pagination structure
  TestValidator.predicate(
    "pagination has current",
    typeof maxLimitResponse.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof maxLimitResponse.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records",
    typeof maxLimitResponse.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof maxLimitResponse.pagination.pages === "number",
  );
  TestValidator.predicate(
    "data is array",
    Array.isArray(maxLimitResponse.data),
  );
  // 8. Verify timestamps are in ISO 8601 date-time format
  // Seller's created_at should be valid ISO 8601
  TestValidator.predicate(
    "seller created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(seller.created_at),
  );
}
