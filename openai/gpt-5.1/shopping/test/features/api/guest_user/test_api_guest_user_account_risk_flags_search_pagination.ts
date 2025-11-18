import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccountRiskFlag";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate pagination behavior of guest user-scoped account risk flag search.
 *
 * Business goal: Ensure that an authenticated admin can retrieve a paginated
 * list of account risk flags linked to a specific guest user and that
 * pagination metadata and page navigation behave consistently.
 *
 * Steps:
 *
 * 1. Join as an admin using POST /auth/admin/join which also sets the
 *    Authorization header on the shared connection.
 * 2. Pick a guestUserId string (in real environments this should be an existing
 *    guest user with many risk flags; in simulation, any string works).
 * 3. Request page 1 with limit 10 from PATCH
 *    /shoppingMall/admin/guestUsers/{guestUserId}/accountRiskFlags.
 * 4. Validate pagination.current, pagination.limit, data length, and that
 *    pagination.records is at least data.length.
 * 5. Request page 2 with the same limit and validate the same constraints. If both
 *    pages contain data, ensure that risk flag IDs do not overlap between page
 *    1 and page 2.
 * 6. Optionally request a page beyond the last known page and confirm that data is
 *    empty while pagination metadata remains consistent.
 */
export async function test_api_guest_user_account_risk_flags_search_pagination(
  connection: api.IConnection,
) {
  // 1. Admin join / authentication
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Select a guestUserId (in practice, this should map to an existing guest user)
  const guestUserId: string = typia.random<string>();

  // Common pagination parameters
  const limit = 10;

  // 3. Page 1 query
  const page1Response: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.accountRiskFlags.index(
      connection,
      {
        guestUserId,
        body: {
          page: 1,
          limit,
        } satisfies IShoppingMallAccountRiskFlag.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(page1Response);

  const page1 = page1Response.pagination;
  const page1Data = page1Response.data;

  TestValidator.equals("page 1: current page should be 1", page1.current, 1);
  TestValidator.equals("page 1: limit should be 10", page1.limit, limit);
  TestValidator.predicate(
    "page 1: data length must be less than or equal to limit",
    page1Data.length <= page1.limit,
  );
  TestValidator.predicate(
    "page 1: records must be at least data length",
    page1.records >= page1Data.length,
  );

  // 4. Page 2 query with same guestUserId and limit
  const page2Response: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.accountRiskFlags.index(
      connection,
      {
        guestUserId,
        body: {
          page: 2,
          limit,
        } satisfies IShoppingMallAccountRiskFlag.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(page2Response);

  const page2 = page2Response.pagination;
  const page2Data = page2Response.data;

  TestValidator.equals("page 2: current page should be 2", page2.current, 2);
  TestValidator.equals("page 2: limit should be 10", page2.limit, limit);
  TestValidator.predicate(
    "page 2: data length must be less than or equal to limit",
    page2Data.length <= page2.limit,
  );
  TestValidator.predicate(
    "page 2: records must be at least data length",
    page2.records >= page2Data.length,
  );

  // If both pages contain data, verify no overlapping risk flag IDs
  if (page1Data.length > 0 && page2Data.length > 0) {
    const page1Ids = new Set(page1Data.map((f) => f.id));
    const hasOverlap = page2Data.some((f) => page1Ids.has(f.id));

    TestValidator.predicate(
      "page 1 and page 2 should not share risk flag IDs when both have data",
      hasOverlap === false,
    );
  }

  // 5. Optional: request a page beyond known pages (if any pages exist)
  const highPageNumber = page1.pages > 0 ? page1.pages + 1 : 999;

  const highPageResponse: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.accountRiskFlags.index(
      connection,
      {
        guestUserId,
        body: {
          page: highPageNumber,
          limit,
        } satisfies IShoppingMallAccountRiskFlag.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(highPageResponse);

  const highPage = highPageResponse.pagination;
  const highPageData = highPageResponse.data;

  TestValidator.equals(
    "high page: current page should equal requested page",
    highPage.current,
    highPageNumber,
  );
  TestValidator.equals("high page: limit should be 10", highPage.limit, limit);
  TestValidator.predicate(
    "high page: records must be non-negative",
    highPage.records >= 0,
  );
  TestValidator.predicate(
    "high page: pages must be non-negative",
    highPage.pages >= 0,
  );
  TestValidator.predicate(
    "high page: data length should be 0 when requesting page beyond pages (if pages > 0)",
    page1.pages > 0 ? highPageData.length === 0 : highPageData.length >= 0,
  );
}
