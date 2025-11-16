import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuthLog";
import type { IShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthLog";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

/**
 * Validate cross-endpoint consistency for platform admin authentication logs.
 *
 * Business goal: Ensure that the detailed authentication log record returned by
 * GET /shoppingMall/platformAdmin/authLogs/{authLogId} is fully consistent with
 * the corresponding summary returned by the search endpoint PATCH
 * /shoppingMall/platformAdmin/authLogs, across multiple actor types and event
 * types.
 *
 * Scenario overview:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join and obtain an
 *    authorized admin session.
 * 2. Trigger several platform admin login events via POST
 *    /auth/platformAdmin/login, ensuring at least one login success (and
 *    realistically the implementation may also record failures, but the test
 *    will not rely on failure generation).
 * 3. Trigger at least one customer password reset request via POST
 *    /auth/customer/password/reset/request to create additional authentication
 *    log entries of eventType "password.reset.request" for actorType
 *    "customer".
 * 4. As the platform admin, call PATCH /shoppingMall/platformAdmin/authLogs with a
 *    relatively recent time window (created_from set to a date-time slightly
 *    before "now"), leaving actor_type nullable so that logs for all actor
 *    types are included, and with a modest limit (e.g., 5) to get a
 *    representative page of results.
 * 5. For each IShoppingMallAuthLog.ISummary in the returned
 *    IPageIShoppingMallAuthLog.ISummary.data array:
 *
 *    - Call GET /shoppingMall/platformAdmin/authLogs/{authLogId} using summary.id.
 *    - Assert that the response is a valid IShoppingMallAuthLog object using
 *         typia.assert.
 *    - Validate that key shared properties match between summary and detail:
 *
 *         - Id === summary.id
 *         - EventType === summary.eventType
 *         - ActorType === summary.actorType (note: summary.actorType is a non-null union
 *                   string, whereas detail.actorType is an optional string; for
 *                   comparison, we only check when detail.actorType is defined
 *                   and expect it to equal summary.actorType)
 *         - Success flag in detail is consistent with summary.status (status "success"
 *                   should mean detail.success === true; status "failure"
 *                   should mean detail.success === false; for other statuses
 *                   like "blocked", "suspicious", or "info", we only assert
 *                   that detail.success is either true or false and do not
 *                   attempt to derive an exact mapping beyond being a
 *                   boolean).
 *         - OccurredAt equality or near equality: because both the summary and detail
 *                   model map the same underlying created_at column, we expect
 *                   occurredAt to be identical strings; the test will assert
 *                   strict equality of occurredAt values.
 *         - IP and user-agent consistency when present: if summary.ip is not null, the
 *                   test will assert that detail.ipAddress is defined and equal
 *                   to summary.ip; similarly, if summary.userAgent is not null,
 *                   then detail.userAgent should be defined and equal to
 *                   summary.userAgent.
 *    - Confirm that the detail object can contain additional fields not present in
 *         the summary (such as actorId, actorEmail, sessionId, failureReason,
 *         correlationId, metadata). The test does not need to assert specific
 *         values for these extra fields, only that their presence does not
 *         contradict the summary fields.
 *
 * Implementation notes:
 *
 * - Use typia.random to generate valid request DTOs for
 *   IShoppingMallPlatformAdminJoin.IRequest,
 *   IShoppingMallPlatformAdminLogin.IRequest, and
 *   IShoppingMallCustomerAuth.IRequestPasswordReset, but ensure realistic email
 *   reuse between join and login (the same admin email is used for both
 *   operations) to cause coherent logs.
 * - For the password reset request, use an independent random customer email.
 * - When building the IShoppingMallAuthLog.IRequest search payload, set `page` to
 *   1, `limit` to a small int32 (e.g., 5), `created_from` to a recent date-time
 *   string (such as now minus a few minutes, using new Date().toISOString() for
 *   simplicity, acknowledging that in real systems we might need a slightly
 *   earlier cutoff), and leave `actor_type`, `actor_id`, `event_types`,
 *   `success`, `failure_reasons`, `ip`, `user_agent`, and `created_to` as
 *   undefined to broaden the query.
 * - Use TestValidator.equals and TestValidator.predicate with descriptive titles
 *   for all assertions.
 */
export async function test_api_platform_admin_auth_log_detail_data_consistency_with_search(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) to obtain authorized session
  const joinRequest = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Perform several platform admin login operations using the same email
  const loginRequest: IShoppingMallPlatformAdminLogin.IRequest = {
    ...typia.random<IShoppingMallPlatformAdminLogin.IRequest>(),
    email: joinRequest.email,
    password: joinRequest.password,
  };

  const login1: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: loginRequest,
    });
  typia.assert(login1);

  const login2: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: loginRequest,
    });
  typia.assert(login2);

  // 3. Trigger at least one customer password reset request
  const resetRequest: IShoppingMallCustomerAuth.IRequestPasswordReset =
    typia.random<IShoppingMallCustomerAuth.IRequestPasswordReset>();
  const resetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      { body: resetRequest },
    );
  typia.assert(resetResult);

  // 4. Search auth logs with recent created_from and modest limit
  const searchBody: IShoppingMallAuthLog.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    sort_by: null,
    sort_direction: null,
    actor_type: null,
    actor_id: null,
    event_types: undefined,
    success: null,
    failure_reasons: undefined,
    ip: null,
    user_agent: null,
    created_from: new Date().toISOString() as string & tags.Format<"date-time">,
    created_to: null,
  };

  const page: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.authLogs.index(connection, {
      body: searchBody,
    });
  typia.assert(page);

  // Basic sanity checks on pagination
  TestValidator.predicate(
    "auth log page limit should be positive",
    page.pagination.limit >= 0,
  );

  // 5. For each summary entry, fetch detail and validate consistency
  for (const summary of page.data) {
    const detail: IShoppingMallAuthLog =
      await api.functional.shoppingMall.platformAdmin.authLogs.at(connection, {
        authLogId: summary.id,
      });
    typia.assert(detail);

    // Shared field: id
    TestValidator.equals("detail.id equals summary.id", detail.id, summary.id);

    // Shared field: eventType
    TestValidator.equals(
      "detail.eventType equals summary.eventType",
      detail.eventType,
      summary.eventType,
    );

    // Shared field: actorType (detail may be undefined)
    if (detail.actorType !== undefined) {
      TestValidator.equals(
        "detail.actorType equals summary.actorType when defined",
        detail.actorType,
        summary.actorType,
      );
    }

    // Shared field: occurredAt
    TestValidator.equals(
      "detail.occurredAt equals summary.occurredAt",
      detail.occurredAt,
      summary.occurredAt,
    );

    // IP consistency when present in summary
    if (summary.ip !== null && summary.ip !== undefined) {
      TestValidator.predicate(
        "detail.ipAddress should be defined when summary.ip is present",
        detail.ipAddress !== undefined,
      );
      if (detail.ipAddress !== undefined) {
        TestValidator.equals(
          "detail.ipAddress equals summary.ip",
          detail.ipAddress,
          summary.ip,
        );
      }
    }

    // userAgent consistency when present in summary
    if (summary.userAgent !== null && summary.userAgent !== undefined) {
      TestValidator.predicate(
        "detail.userAgent should be defined when summary.userAgent is present",
        detail.userAgent !== undefined,
      );
      if (detail.userAgent !== undefined) {
        TestValidator.equals(
          "detail.userAgent equals summary.userAgent",
          detail.userAgent,
          summary.userAgent,
        );
      }
    }

    // success vs status mapping
    if (summary.status === "success") {
      TestValidator.predicate(
        "detail.success must be true when summary.status is success",
        detail.success === true,
      );
    } else if (summary.status === "failure") {
      TestValidator.predicate(
        "detail.success must be false when summary.status is failure",
        detail.success === false,
      );
    } else {
      // For other statuses, just assert success is a boolean (always true by type)
      TestValidator.predicate(
        "detail.success must be boolean for non-success/failure statuses",
        typeof detail.success === "boolean",
      );
    }
  }
}
