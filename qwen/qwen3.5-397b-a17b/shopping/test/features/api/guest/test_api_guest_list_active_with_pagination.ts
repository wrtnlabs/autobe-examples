import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator guest list retrieval with pagination for active guests.
 *
 * Validates the complete workflow for administrators to list and paginate through active guest accounts. The test ensures that administrators can authenticate, query the guest list with default filters (active guests only), and navigate through paginated results.
 *
 * The test verifies that the pagination metadata is correctly structured with current page, limit, total records, and total pages. It also validates that all returned guest records have deleted_at set to null, confirming that only active guests are returned by default.
 *
 * 1. Administrator authenticates via join operation with randomized credentials.
 * 2. Administrator queries guest list page 1 without filters (default: active guests, limit default).
 * 3. Validates pagination metadata structure and values.
 * 4. Validates all guest records have deleted_at === null (active only).
 * 5. Administrator queries guest list page 2 with limit 10.
 * 6. Validates pagination metadata reflects page 2 with correct calculations.
 * 7. Validates all guest records on page 2 also have deleted_at === null.
 */
export async function test_api_guest_list_active_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Query guest list page 1 (default: active guests, no filters)
  const page1Response = await api.functional.shoppingMall.admin.guests.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGuest.IRequest,
    },
  );
  typia.assert(page1Response);
  // 3. Validate pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 records is non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages is non-negative",
    page1Response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 1 pages calculated correctly",
    page1Response.pagination.pages ===
      Math.ceil(
        page1Response.pagination.records / page1Response.pagination.limit,
      ),
  );
  // 4. Validate all guests on page 1 have deleted_at === null (active only)
  for (const guest of page1Response.data) {
    TestValidator.predicate(
      `guest ${guest.id} is active`,
      guest.deleted_at === null,
    );
  }
  // 5. Query guest list page 2 with limit 10
  const page2Response = await api.functional.shoppingMall.admin.guests.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallGuest.IRequest,
    },
  );
  typia.assert(page2Response);
  // 6. Validate pagination metadata for page 2
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  TestValidator.equals(
    "page 2 records matches page 1",
    page2Response.pagination.records,
    page1Response.pagination.records,
  );
  TestValidator.predicate(
    "page 2 pages calculated correctly",
    page2Response.pagination.pages ===
      Math.ceil(
        page2Response.pagination.records / page2Response.pagination.limit,
      ),
  );
  // 7. Validate all guests on page 2 have deleted_at === null (active only)
  for (const guest of page2Response.data) {
    TestValidator.predicate(
      `guest ${guest.id} is active`,
      guest.deleted_at === null,
    );
  }
}
