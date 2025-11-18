import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundsAndDisputesCaseSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundsAndDisputesCaseSummary";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundsAndDisputesCaseSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundsAndDisputesCaseSearch";
import type { IShoppingMallRefundsAndDisputesCaseSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundsAndDisputesCaseSummary";

/**
 * Ensure SLA-breached-only filter on admin refunds/disputes case search behaves
 * consistently.
 *
 * Business context
 *
 * - Admins can search refund, cancellation, and dispute-related activity through
 *   a unified search endpoint backed by multiple case tables and SLA
 *   evaluations.
 * - The request DTO exposes an `includeOnlySlaBreached` flag, but the exposed
 *   response shape is a page of daily stats snapshots rather than individual
 *   case rows. Therefore we validate behavior through pagination and relative
 *   result counts instead of inspecting per-case SLA flags.
 *
 * Scenario
 *
 * 1. Join as an admin using `POST /auth/admin/join` to obtain an
 *    `IShoppingMallAdmin.IAuthorized` payload and an authenticated connection.
 * 2. Perform a baseline search on `PATCH
 *    /shoppingMall/admin/refundsAndDisputes/search/cases` with
 *    `includeOnlySlaBreached` disabled (or false) and a small page size.
 * 3. Perform a second search with the same pagination but with
 *    `includeOnlySlaBreached: true` and a date range covering the last 30
 *    days.
 * 4. Validate that both responses:
 *
 *    - Conform to `IPageIShoppingMallRefundsAndDisputesCaseSummary`.
 *    - Echo the requested `page` and `limit` in `pagination`.
 * 5. Additionally assert that, under identical pagination, the SLA-only result set
 *    never has more entries than the baseline set, reflecting that the
 *    SLA-breached-only filter is at most as permissive as the unfiltered
 *    query.
 */
export async function test_api_admin_refunds_and_disputes_case_search_sla_breached_only(
  connection: api.IConnection,
) {
  // 1. Admin join / authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Baseline search (no SLA-only filter)
  const baselineRequest = {
    page: 1,
    limit: 5,
    includeOnlySlaBreached: false,
  } satisfies IShoppingMallRefundsAndDisputesCaseSearch.IRequest;

  const baselinePage: IPageIShoppingMallRefundsAndDisputesCaseSummary =
    await api.functional.shoppingMall.admin.refundsAndDisputes.search.cases.index(
      connection,
      {
        body: baselineRequest,
      },
    );
  typia.assert(baselinePage);

  TestValidator.equals(
    "baseline pagination current page should be 1",
    baselinePage.pagination.current,
    baselineRequest.page,
  );
  TestValidator.equals(
    "baseline pagination limit should equal requested limit",
    baselinePage.pagination.limit,
    baselineRequest.limit,
  );

  // 3. SLA-breached-only search within a recent date window
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - thirtyDaysMs).toISOString();
  const toDate = now.toISOString();

  const slaOnlyRequest = {
    page: baselineRequest.page,
    limit: baselineRequest.limit,
    includeOnlySlaBreached: true,
    createdFrom: fromDate,
    createdTo: toDate,
  } satisfies IShoppingMallRefundsAndDisputesCaseSearch.IRequest;

  const slaOnlyPage: IPageIShoppingMallRefundsAndDisputesCaseSummary =
    await api.functional.shoppingMall.admin.refundsAndDisputes.search.cases.index(
      connection,
      {
        body: slaOnlyRequest,
      },
    );
  typia.assert(slaOnlyPage);

  TestValidator.equals(
    "SLA-only pagination current page should be 1",
    slaOnlyPage.pagination.current,
    slaOnlyRequest.page,
  );
  TestValidator.equals(
    "SLA-only pagination limit should equal requested limit",
    slaOnlyPage.pagination.limit,
    slaOnlyRequest.limit,
  );

  // 4. Sanity: SLA-only results cannot exceed baseline results under same page/limit
  TestValidator.predicate(
    "SLA-only result count should not exceed baseline result count for same page/limit",
    slaOnlyPage.data.length <= baselinePage.data.length,
  );

  // Simple type-level assertions for one element when present
  if (baselinePage.data.length > 0) {
    const sample = baselinePage.data[0];
    typia.assert<IShoppingMallRefundsAndDisputesCaseSummary>(sample);
  }
  if (slaOnlyPage.data.length > 0) {
    const sample = slaOnlyPage.data[0];
    typia.assert<IShoppingMallRefundsAndDisputesCaseSummary>(sample);
  }
}
