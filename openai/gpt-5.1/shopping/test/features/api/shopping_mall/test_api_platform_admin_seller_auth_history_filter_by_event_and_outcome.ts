import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuthLog";
import type { IShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSellerPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequest";

/**
 * Verify that a platform administrator can filter a seller's authentication
 * history by event type and success outcome using the seller authHistory
 * endpoint.
 *
 * Business goal:
 *
 * - Ensure that the seller auth history search honors event_types[] and success
 *   filters so that platform admins can slice authentication activity by
 *   semantic event category and outcome for security analysis.
 *
 * Test flow (adapted to available APIs):
 *
 * 1. Register a platform administrator using POST /auth/platformAdmin/join
 *    (api.functional.auth.platformAdmin.join) with a fully-populated
 *    IShoppingMallPlatformAdminJoin.IRequest generated via typia.random().
 *
 *    - Assert the returned IShoppingMallPlatformAdmin.IAuthorized with typia.assert
 *         to validate typing.
 *    - Do NOT touch connection.headers manually; the SDK already wires the access
 *         token into Authorization for subsequent calls.
 * 2. Trigger a seller password reset request via POST
 *    /auth/seller/password/reset/request
 *    (api.functional.auth.seller.password.reset.request.requestPasswordReset)
 *    using a random but valid email address
 *    (IShoppingMallSellerPasswordResetRequest.IRequest).
 *
 *    - Assert the IShoppingMallSellerPasswordResetRequest.IResponse with
 *         typia.assert.
 *    - We intentionally do not try to tie this to a specific sellerId because no
 *         seller identity APIs are exposed; the goal is only to ensure that
 *         such events can exist in the underlying auth log stream.
 * 3. Choose a synthetic sellerId for the auth history search.
 *
 *    - Since there is no seller creation API, we cannot deterministically create or
 *         identify a concrete sellerId; instead, generate a random UUID-like
 *         string via typia.random<string & tags.Format<"uuid">>() and use it as
 *         sellerId.
 *    - This is acceptable for simulate mode or a permissive backend because we are
 *         validating filter semantics and typing rather than strict correlation
 *         to earlier events.
 * 4. Build a first IShoppingMallAuthLog.IRequest filter body that requests
 *    successful login and password reset request events:
 *
 *    - Page: 1 (one-based index as per docs, but the server may convert it to
 *         zero-based pagination.current)
 *    - Limit: small int32 (e.g., 20)
 *    - Sort_by: "occurredAt" (a plausible summary field name)
 *    - Sort_direction: "desc" (most recent events first)
 *    - Actor_type, actor_id: left undefined so that sellerId path parameter scopes
 *         the query
 *    - Event_types: ["login.success", "password.reset.request"]
 *    - Success: true
 *    - All other filters undefined
 * 5. Call PATCH /shoppingMall/platformAdmin/sellers/{sellerId}/authHistory via
 *    api.functional.shoppingMall.platformAdmin.sellers.authHistory.index with
 *    the synthetic sellerId and the above body.
 *
 *    - Assert the response with typia.assert<IPageIShoppingMallAuthLog.ISummary>().
 * 6. Validate the response data for the first query:
 *
 *    - Use TestValidator.predicate to ensure pagination.limit is non-negative and
 *         that records/pages are also non-negative.
 *    - If data.length === 0, treat this as a valid case (no matching events) but
 *         still validate pagination consistency: when records === 0 then pages
 *         === 0.
 *    - If data.length > 0:
 *
 *         - For every entry, assert: a) eventType is either "login.success" or
 *                   "password.reset.request". b) status === "success" because
 *                   we requested success=true. c) When actorId is present,
 *                   actorType === "seller" to reflect seller-scoped logs for
 *                   this endpoint.
 * 7. Build a second IShoppingMallAuthLog.IRequest filter body that requests failed
 *    login events:
 *
 *    - Page: 1, limit: 20, sort_by: "occurredAt", sort_direction: "desc" as before
 *    - Event_types: ["login.failure"]
 *    - Success: false
 * 8. Call the same authHistory.index endpoint again with the second filter body
 *    and the same sellerId, assert the response type, and then apply validation
 *    logic similar to step 6:
 *
 *    - If data.length === 0, only assert pagination consistency.
 *    - If data.length > 0, for each entry assert:
 *
 *         - EventType === "login.failure".
 *         - Status === "failure".
 *         - ActorType === "seller" when actorId is present.
 * 9. Throughout the test, never manipulate connection.headers manually; rely
 *    entirely on the SDK's token injection behavior from the platformAdmin join
 *    call. Always use await for API invocations and typia.assert for non-void
 *    responses.
 */
export async function test_api_platform_admin_seller_auth_history_filter_by_event_and_outcome(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (join)
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Trigger a seller password reset request (to ensure such event type exists in logs in general)
  const resetRequestBody =
    typia.random<IShoppingMallSellerPasswordResetRequest.IRequest>();
  const resetResponse: IShoppingMallSellerPasswordResetRequest.IResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert<IShoppingMallSellerPasswordResetRequest.IResponse>(
    resetResponse,
  );

  // 3. Choose a synthetic sellerId (random UUID) for auth history query
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. First query: success=true, event_types [login.success, password.reset.request]
  const firstFilterBody = {
    page: 1 as number,
    limit: 20 as number,
    sort_by: "occurredAt",
    sort_direction: "desc",
    event_types: ["login.success", "password.reset.request"],
    success: true,
  } satisfies IShoppingMallAuthLog.IRequest;

  const firstPage: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellers.authHistory.index(
      connection,
      {
        sellerId,
        body: firstFilterBody,
      },
    );
  typia.assert<IPageIShoppingMallAuthLog.ISummary>(firstPage);

  // 6. Validate first query response
  const pagination1 = firstPage.pagination;
  TestValidator.predicate(
    "first query pagination has non-negative limit/records/pages",
    pagination1.limit >= 0 &&
      pagination1.records >= 0 &&
      pagination1.pages >= 0,
  );

  if (pagination1.records === 0) {
    TestValidator.equals(
      "first query pages is 0 when no records",
      pagination1.pages,
      0,
    );
  }

  const allowedFirstTypes = [
    "login.success",
    "password.reset.request",
  ] as const;

  for (const log of firstPage.data) {
    // eventType must be one of requested types
    TestValidator.predicate(
      "first query log eventType is in [login.success, password.reset.request]",
      allowedFirstTypes.includes(
        log.eventType as (typeof allowedFirstTypes)[number],
      ),
    );

    // success filter should imply status === "success"
    TestValidator.equals(
      "first query log status is success when success=true",
      log.status,
      "success",
    );

    if (log.actorId !== undefined) {
      TestValidator.equals(
        "first query actorType is seller when actorId is present",
        log.actorType,
        "seller",
      );
    }
  }

  // 7. Second query: success=false, event_types [login.failure]
  const secondFilterBody = {
    page: 1 as number,
    limit: 20 as number,
    sort_by: "occurredAt",
    sort_direction: "desc",
    event_types: ["login.failure"],
    success: false,
  } satisfies IShoppingMallAuthLog.IRequest;

  const secondPage: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellers.authHistory.index(
      connection,
      {
        sellerId,
        body: secondFilterBody,
      },
    );
  typia.assert<IPageIShoppingMallAuthLog.ISummary>(secondPage);

  const pagination2 = secondPage.pagination;
  TestValidator.predicate(
    "second query pagination has non-negative limit/records/pages",
    pagination2.limit >= 0 &&
      pagination2.records >= 0 &&
      pagination2.pages >= 0,
  );

  if (pagination2.records === 0) {
    TestValidator.equals(
      "second query pages is 0 when no records",
      pagination2.pages,
      0,
    );
  }

  for (const log of secondPage.data) {
    // eventType must be exactly login.failure
    TestValidator.equals(
      "second query log eventType is login.failure",
      log.eventType,
      "login.failure",
    );

    // success=false filter should imply status === "failure"
    TestValidator.equals(
      "second query log status is failure when success=false",
      log.status,
      "failure",
    );

    if (log.actorId !== undefined) {
      TestValidator.equals(
        "second query actorType is seller when actorId is present",
        log.actorType,
        "seller",
      );
    }
  }
}
