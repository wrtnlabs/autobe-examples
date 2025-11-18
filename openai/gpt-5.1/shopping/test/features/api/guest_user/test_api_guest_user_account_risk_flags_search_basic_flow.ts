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
 * Validate guest user scoped account risk flag search basic flow.
 *
 * Business goal
 *
 * - Ensure that an authenticated admin can search account risk flags scoped to a
 *   specific guest user using the PATCH
 *   /shoppingMall/admin/guestUsers/{guestUserId}/accountRiskFlags endpoint.
 * - Verify that the response structure matches
 *   IPageIShoppingMallAccountRiskFlag.ISummary and that basic filters like
 *   actor_type, active and severity behave consistently when the backend is not
 *   running in simulation mode.
 *
 * High‑level steps
 *
 * 1. Join as an admin via POST /auth/admin/join to obtain an authorized admin
 *    context.
 * 2. Choose a target guestUserId (random UUID) to scope the risk flag search.
 * 3. Call accountRiskFlags.index with a base search request
 *    (page/limit/order_by/order_direction/actor_type).
 * 4. When not in simulate mode, make additional calls with active=true,
 *    active=false, and a picked severity value to verify that filters narrow
 *    result sets and that all returned items obey the filter conditions.
 * 5. Ensure that repeated calls with the same parameters are non‑mutating and
 *    consistently type‑safe.
 */
export async function test_api_guest_user_account_risk_flags_search_basic_flow(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin via join
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare guestUserId and base search request
  const guestUserId = typia.random<string & tags.Format<"uuid">>();

  const baseRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at",
    order_direction: "desc",
    actor_type: "guestuser",
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  // Helper to perform a single search call
  const search = async (
    body: IShoppingMallAccountRiskFlag.IRequest,
  ): Promise<IPageIShoppingMallAccountRiskFlag.ISummary> => {
    const page =
      await api.functional.shoppingMall.admin.guestUsers.accountRiskFlags.index(
        connection,
        {
          guestUserId,
          body,
        },
      );
    typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(page);
    return page;
  };

  // 3. Base search without active/severity filters
  const basePage = await search(baseRequest);

  // Basic pagination invariants
  TestValidator.equals(
    "base pagination current matches request page",
    basePage.pagination.current,
    baseRequest.page,
  );
  TestValidator.equals(
    "base pagination limit matches request limit",
    basePage.pagination.limit,
    baseRequest.limit,
  );
  TestValidator.predicate(
    "base pagination records non‑negative",
    basePage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "base pagination pages non‑negative",
    basePage.pagination.pages >= 0,
  );

  // Check actor_type consistency in base results
  for (const flag of basePage.data) {
    TestValidator.equals(
      "base result actor_type is guestuser",
      flag.actor_type,
      "guestuser",
    );
  }

  // If in simulate mode, we cannot reliably assert filter semantics, so stop after
  // structural validations.
  if (connection.simulate === true) return;

  // 4. Active=true and active=false filter behavior
  const activeTrueRequest: IShoppingMallAccountRiskFlag.IRequest = {
    ...baseRequest,
    active: true,
  };
  const activeFalseRequest: IShoppingMallAccountRiskFlag.IRequest = {
    ...baseRequest,
    active: false,
  };

  const activeTruePage = await search(activeTrueRequest);
  const activeFalsePage = await search(activeFalseRequest);

  // All items in active=true page must have active === true
  for (const flag of activeTruePage.data) {
    TestValidator.predicate(
      "active=true filter returns only active flags",
      flag.active === true,
    );
  }

  // All items in active=false page must have active === false
  for (const flag of activeFalsePage.data) {
    TestValidator.predicate(
      "active=false filter returns only inactive flags",
      flag.active === false,
    );
  }

  // Adding an active filter must not increase the number of records
  TestValidator.predicate(
    "active=true results are not broader than base",
    activeTruePage.data.length <= basePage.data.length,
  );
  TestValidator.predicate(
    "active=false results are not broader than base",
    activeFalsePage.data.length <= basePage.data.length,
  );

  // 5. Severity filter behavior
  if (basePage.data.length > 0) {
    const severity = basePage.data[0]?.severity;

    const severityRequest: IShoppingMallAccountRiskFlag.IRequest = {
      ...baseRequest,
      severity,
    };
    const severityPage = await search(severityRequest);

    for (const flag of severityPage.data) {
      TestValidator.equals(
        "severity filter returns only matching severity",
        flag.severity,
        severity,
      );
    }

    TestValidator.predicate(
      "severity-filtered results are not broader than base",
      severityPage.data.length <= basePage.data.length,
    );
  }

  // 6. Idempotence / non‑mutating nature: repeat base search
  const basePageAgain = await search(baseRequest);
  // Ensure type and pagination invariants still hold and call succeeds
  TestValidator.equals(
    "repeated base pagination current matches request page",
    basePageAgain.pagination.current,
    baseRequest.page,
  );
  TestValidator.equals(
    "repeated base pagination limit matches request limit",
    basePageAgain.pagination.limit,
    baseRequest.limit,
  );
}
