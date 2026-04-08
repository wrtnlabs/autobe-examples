import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test cursor-based pagination functionality for large audit log datasets.
 * Authenticates as super administrator, fetches initial page with small limit,
 * uses cursor from last item to fetch next page, and validates pagination
 * behavior including no duplicate entries across pages.
 */
export async function test_api_audit_log_cursor_pagination_navigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // 2. Make initial request with small limit to ensure partial results
  const initialLimit = 2;
  const firstPage =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          adminId: null,
          actionTypes: null,
          resourceTypes: null,
          resourceId: null,
          ipAddress: null,
          dateFrom: null,
          dateTo: null,
          createdAt: null,
          id: null,
          limit: initialLimit,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate first page structure and pagination metadata
  TestValidator.predicate(
    "first page has pagination",
    firstPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "first page has data array",
    Array.isArray(firstPage.data),
  );
  TestValidator.equals(
    "first page limit matches request",
    firstPage.pagination.limit,
    initialLimit,
  );
  // Skip further cursor testing if not enough records exist
  if (
    firstPage.data.length < initialLimit ||
    firstPage.pagination.records <= initialLimit
  ) {
    // Not enough data to test cursor pagination meaningfully
    return;
  }
  // 3. Capture cursor values from the last item of first page
  const lastItem = firstPage.data[firstPage.data.length - 1];
  TestValidator.predicate(
    "last item has createdAt",
    lastItem.createdAt !== null && lastItem.createdAt !== undefined,
  );
  TestValidator.predicate(
    "last item has id",
    lastItem.id !== null && lastItem.id !== undefined,
  );
  // 4. Make subsequent request using cursor values
  const secondPage =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          adminId: null,
          actionTypes: null,
          resourceTypes: null,
          resourceId: null,
          ipAddress: null,
          dateFrom: null,
          dateTo: null,
          createdAt: lastItem.createdAt,
          id: lastItem.id,
          limit: initialLimit,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(secondPage);
  // 5. Validate second page has different records (no duplicates)
  const firstPageIds = new Set(firstPage.data.map((item) => item.id));
  const secondPageIds = new Set(secondPage.data.map((item) => item.id));
  // Check for duplicates - second page should not contain any IDs from first page
  let hasDuplicates = false;
  for (const id of secondPageIds) {
    if (firstPageIds.has(id)) {
      hasDuplicates = true;
      break;
    }
  }
  TestValidator.predicate("no duplicate IDs across pages", !hasDuplicates);
  // 6. Verify pagination metadata is correctly populated
  TestValidator.predicate(
    "second page has pagination",
    secondPage.pagination !== undefined,
  );
  TestValidator.equals(
    "second page limit matches request",
    secondPage.pagination.limit,
    initialLimit,
  );
  TestValidator.predicate(
    "total records is non-negative",
    secondPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    secondPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "current page is valid",
    secondPage.pagination.current >= 0,
  );
  // Additional validation: Combined records from both pages should be unique
  const combinedIds = [...firstPageIds, ...secondPageIds];
  const uniqueIds = new Set(combinedIds);
  TestValidator.equals(
    "combined pages have unique entries",
    combinedIds.length,
    uniqueIds.size,
  );
}
