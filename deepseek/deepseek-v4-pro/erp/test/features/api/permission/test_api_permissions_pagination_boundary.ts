import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmPermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test pagination boundary behavior for the permissions listing endpoint.
 *
 * Validates that the PATCH /erpHrm/permissions endpoint correctly handles page-based pagination across the fixed catalog of nine system permissions. Tests include navigating to specific pages, fetching the last page, and requesting pages beyond the available range.
 *
 * 1. Request the first page with limit=3 and verify pagination metadata: 3 records returned, current=1, limit=3, records=9, pages=3.
 * 2. Request the last page (page=3) with limit=3 and verify exactly 3 records are returned.
 * 3. Request page 5 (beyond available range) and verify an empty data array with valid pagination metadata (records=9, pages=3).
 */
export async function test_api_permissions_pagination_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Request first page with limit=3
  const page1 = await api.functional.erpHrm.permissions.index(connection, {
    body: { limit: 3, page: 1 } satisfies IErpHrmPermission.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals("page 1 record count", page1.data.length, 3);
  TestValidator.equals(
    "page 1 pagination.current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination.limit", page1.pagination.limit, 3);
  TestValidator.equals(
    "page 1 pagination.records",
    page1.pagination.records,
    9,
  );
  TestValidator.equals("page 1 pagination.pages", page1.pagination.pages, 3);
  // 2. Request last page (page 3) with limit=3
  const page3 = await api.functional.erpHrm.permissions.index(connection, {
    body: { limit: 3, page: 3 } satisfies IErpHrmPermission.IRequest,
  });
  typia.assert(page3);
  TestValidator.equals("page 3 record count", page3.data.length, 3);
  // 3. Request page beyond available range (page 5)
  const page5 = await api.functional.erpHrm.permissions.index(connection, {
    body: { limit: 3, page: 5 } satisfies IErpHrmPermission.IRequest,
  });
  typia.assert(page5);
  TestValidator.equals("page 5 empty data", page5.data.length, 0);
  TestValidator.equals(
    "page 5 pagination.records",
    page5.pagination.records,
    9,
  );
  TestValidator.equals("page 5 pagination.pages", page5.pagination.pages, 3);
}
