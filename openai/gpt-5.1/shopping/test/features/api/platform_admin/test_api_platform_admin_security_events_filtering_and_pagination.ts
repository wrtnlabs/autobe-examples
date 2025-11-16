import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSecurityEvent";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEvent";

/**
 * Verify platform admin security events filtering and pagination.
 *
 * Business goal
 *
 * - Ensure PATCH
 *   /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/securityEvents
 *   returns a paginated list of security events for a specific platform
 *   administrator and supports basic filtering by event_type and time window.
 *
 * Test flow (single happy-path oriented scenario with defensive branches):
 *
 * 1. Join a new platform admin with unique email and realistic session context.
 * 2. Perform multiple successful login attempts to generate security-related
 *    activity for that admin account.
 * 3. Perform one failed login attempt (wrong password) wrapped in
 *    TestValidator.error to confirm authentication failures surface as errors.
 *    We do not rely on the exact error payload or HTTP status.
 * 4. Call the securityEvents.index endpoint with a broad filter (page=1, small
 *    limit) to fetch a first page of events.
 *
 *    - Assert response type with typia.assert.
 *    - Assert pagination.limit is >= data.length and > 0.
 *    - If pagination.records > pagination.limit, assert pagination.pages > 1.
 * 5. If the first page has at least one event:
 *
 *    - Capture that event's event_type as knownEventType.
 *    - Re-query index with event_type=knownEventType.
 *    - Assert all returned summaries have event_type === knownEventType.
 *    - Assert filtered.pagination.records <= broad.pagination.records.
 * 6. If there are at least two events in the broad result:
 *
 *    - Collect occurredAt values and sort ascending.
 *    - Use earliest and latest timestamps as a wide window and assert that every
 *         returned occurredAt from a time-window query lies within
 *         [created_from, created_to].
 *    - Use a mid timestamp as created_from for a narrower window query and assert
 *         all returned events respect the narrowed time range.
 *
 * The scenario intentionally avoids assuming specific event_type constants
 * (like LOGIN_SUCCESS/LOGIN_FAILURE) or exact event counts, because those are
 * not enforced by the DTOs. Instead, it discovers an existing event_type from
 * the data and uses it for filtering, and it uses the occurredAt timestamps to
 * validate temporal filters. This keeps the test robust to implementation
 * details while still exercising filtering and pagination paths.
 */
export async function test_api_platform_admin_security_events_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Join a new platform admin
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinHref = typia.random<string & tags.Format<"uri">>();
  const joinReferrer = typia.random<string & tags.Format<"uri">>();

  const joinBody = {
    email: joinEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.mobile(),
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const joinedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Perform multiple successful login attempts
  const loginHref = typia.random<string & tags.Format<"uri">>();
  const loginReferrer = typia.random<string & tags.Format<"uri">>();

  const loginBody = {
    email: joinEmail,
    password: joinBody.password,
    ip: joinBody.ip ?? null,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  // Execute several logins to generate activity
  for (let i = 0; i < 3; i++) {
    const loggedIn: IShoppingMallPlatformAdmin.IAuthorized =
      await api.functional.auth.platformAdmin.login(connection, {
        body: loginBody,
      });
    typia.assert(loggedIn);
  }

  // 3. One failed login attempt with wrong password (error scenario)
  await TestValidator.error(
    "platform admin login with wrong password should fail",
    async () => {
      const badLoginBody = {
        email: joinEmail,
        password: `${joinBody.password}_wrong`,
        ip: loginBody.ip,
        href: loginBody.href,
        referrer: loginBody.referrer,
      } satisfies IShoppingMallPlatformAdminLogin.IRequest;

      await api.functional.auth.platformAdmin.login(connection, {
        body: badLoginBody,
      });
    },
  );

  // 4. Broad security events query for this platform admin
  const broadRequest = {
    page: 1,
    limit: 5,
  } satisfies IShoppingMallSecurityEvent.IRequest;

  const broadPage: IPageIShoppingMallSecurityEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.securityEvents.index(
      connection,
      {
        platformAdminId: joinedAdmin.id,
        body: broadRequest,
      },
    );
  typia.assert(broadPage);

  const { pagination: broadPagination, data: broadData } = broadPage;

  // Basic pagination invariants
  TestValidator.predicate(
    "pagination.limit should be >= number of returned events and > 0",
    broadPagination.limit >= broadData.length && broadPagination.limit > 0,
  );

  if (broadPagination.records > broadPagination.limit) {
    TestValidator.predicate(
      "when records exceed limit, pages should be more than one",
      broadPagination.pages > 1,
    );
  }

  if (broadData.length === 0) {
    // If there are no events yet, the endpoint still responded correctly. We
    // cannot perform filtering checks, so finish after validating pagination.
    TestValidator.equals(
      "when no data, records should be 0",
      broadPagination.records,
      0,
    );
    return;
  }

  // 5. Filter by a known event_type discovered from the data
  const knownEventType = broadData[0].event_type;

  const eventTypeRequest = {
    page: 1,
    limit: 10,
    event_type: knownEventType,
  } satisfies IShoppingMallSecurityEvent.IRequest;

  const eventTypePage: IPageIShoppingMallSecurityEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.securityEvents.index(
      connection,
      {
        platformAdminId: joinedAdmin.id,
        body: eventTypeRequest,
      },
    );
  typia.assert(eventTypePage);

  const { pagination: eventTypePagination, data: eventTypeData } =
    eventTypePage;

  // All returned events must match the requested event_type
  for (const summary of eventTypeData) {
    TestValidator.equals(
      "filtered events must all have the requested event_type",
      summary.event_type,
      knownEventType,
    );
  }

  TestValidator.predicate(
    "filtered records should not exceed broad records",
    eventTypePagination.records <= broadPagination.records,
  );

  // 6. Time-window filtering using occurredAt timestamps
  if (broadData.length >= 2) {
    const timestamps = broadData.map((s) => s.occurredAt).sort();

    const earliest = timestamps[0];
    const latest = timestamps[timestamps.length - 1];

    const wideWindowRequest = {
      page: 1,
      limit: 10,
      created_from: earliest,
      created_to: latest,
    } satisfies IShoppingMallSecurityEvent.IRequest;

    const wideWindowPage: IPageIShoppingMallSecurityEvent.ISummary =
      await api.functional.shoppingMall.platformAdmin.platformAdmins.securityEvents.index(
        connection,
        {
          platformAdminId: joinedAdmin.id,
          body: wideWindowRequest,
        },
      );
    typia.assert(wideWindowPage);

    for (const summary of wideWindowPage.data) {
      TestValidator.predicate(
        "wide window events must fall within [created_from, created_to]",
        summary.occurredAt >= earliest && summary.occurredAt <= latest,
      );
    }

    const midIndex = Math.floor(timestamps.length / 2);
    const mid = timestamps[midIndex];

    const narrowWindowRequest = {
      page: 1,
      limit: 10,
      created_from: mid,
      created_to: latest,
    } satisfies IShoppingMallSecurityEvent.IRequest;

    const narrowWindowPage: IPageIShoppingMallSecurityEvent.ISummary =
      await api.functional.shoppingMall.platformAdmin.platformAdmins.securityEvents.index(
        connection,
        {
          platformAdminId: joinedAdmin.id,
          body: narrowWindowRequest,
        },
      );
    typia.assert(narrowWindowPage);

    for (const summary of narrowWindowPage.data) {
      TestValidator.predicate(
        "narrow window events must fall within [mid, latest]",
        summary.occurredAt >= mid && summary.occurredAt <= latest,
      );
    }

    TestValidator.predicate(
      "narrow window should not have more records than the wide one",
      narrowWindowPage.pagination.records <= wideWindowPage.pagination.records,
    );
  }
}
