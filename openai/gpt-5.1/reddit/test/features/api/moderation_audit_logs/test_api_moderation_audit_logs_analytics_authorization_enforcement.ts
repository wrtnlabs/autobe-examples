import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

/**
 * Enforce that only authenticated platform administrators can access moderation
 * audit logs analytics.
 *
 * This test exercises three authorization-related flows for the PATCH
 * /communityPlatform/platformAdmin/analytics/moderationAuditLogs endpoint:
 *
 * 1. Unauthenticated connection: ensure that calling the analytics endpoint
 *    without any Authorization header results in an error.
 * 2. Authenticated platform admin: register a new platform admin via
 *    /auth/platformAdmin/join, rely on the SDK to attach a valid JWT access
 *    token to the connection, then verify that the analytics endpoint succeeds
 *    and returns a valid IPageICommunityPlatformModerationAuditLog.ISummary
 *    page.
 * 3. Bogus token: simulate a connection carrying an obviously invalid
 *    Authorization token and confirm that the analytics request fails again
 *    without inspecting concrete HTTP status codes.
 *
 * Business context: Moderation audit logs contain sensitive security and
 * policy-enforcement information (who moderated what, when, and with what
 * outcome). Access to this analytics surface must therefore be restricted to
 * high-privilege roles such as platform administrators. Regular users or
 * unauthenticated callers must not see this data.
 *
 * Step-by-step process:
 *
 * 1. Build a minimal, valid ICommunityPlatformModerationAuditLog.IRequest payload
 *    using page/limit and a wide time range (from ~30 days ago to now) to keep
 *    the business semantics realistic.
 * 2. Create an unauthenticated connection by shallow-cloning the provided
 *    connection and overriding headers with an empty object, ensuring we never
 *    mutate connection.headers in-place.
 * 3. Call the analytics endpoint with this unauthenticated connection and assert
 *    that it throws using TestValidator.error.
 * 4. Register a new platform administrator via
 *    api.functional.auth.platformAdmin.join using a properly constructed
 *    ICommunityPlatformPlatformadmin.IJoin payload. Validate the IAuthorized
 *    response with typia.assert and rely on the SDK to populate the
 *    Authorization header on the original connection.
 * 5. Using the now-authenticated original connection, call the analytics endpoint
 *    with the same request body and assert success:
 *
 *    - Typia.assert the IPageICommunityPlatformModerationAuditLog.ISummary response.
 *    - Use TestValidator.predicate to check basic pagination invariants (current >=
 *         0, limit >= 0, records >= 0, pages >= 0) and that the data length
 *         does not exceed pagination.limit.
 * 6. Build a "bogus token" connection by shallow-cloning the authenticated
 *    connection and overriding headers.Authorization with an obviously invalid
 *    value like "Bearer invalid.token.value". Call the analytics endpoint with
 *    this bogus connection and assert via TestValidator.error that the call
 *    fails, again without depending on concrete HTTP status codes or error body
 *    structures.
 */
export async function test_api_moderation_audit_logs_analytics_authorization_enforcement(
  connection: api.IConnection,
) {
  // 1. Build a minimal, semantically valid analytics request body.
  const now: Date = new Date();
  const thirtyDaysAgo: Date = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  );

  const requestBody = {
    page: 1,
    limit: 20,
    from: thirtyDaysAgo.toISOString(),
    to: now.toISOString(),
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  // 2. Prepare an unauthenticated connection by shallow-cloning the
  //    incoming connection and giving it an empty headers object. Do not
  //    mutate the original connection.headers.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Attempt to call the analytics endpoint without authentication
  //    and expect an authorization-related error.
  await TestValidator.error(
    "unauthenticated access to moderation audit analytics must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.analytics.moderationAuditLogs.index(
        unauthenticatedConnection,
        {
          body: requestBody,
        },
      );
    },
  );

  // 4. Register a new platform administrator to obtain an authenticated
  //    platformAdmin context. The SDK's join() call will attach the
  //    Authorization header to the original `connection`.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 5. Call the analytics endpoint again using the now-authenticated
  //    original connection and verify success and pagination invariants.
  const analyticsPage: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.analytics.moderationAuditLogs.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageICommunityPlatformModerationAuditLog.ISummary>(
    analyticsPage,
  );

  const pagination = analyticsPage.pagination;

  TestValidator.predicate(
    "pagination.current must be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit must be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records must be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages must be non-negative",
    pagination.pages >= 0,
  );

  TestValidator.predicate(
    "data length must not exceed pagination.limit when limit is positive",
    pagination.limit === 0 || analyticsPage.data.length <= pagination.limit,
  );

  // 6. Simulate a connection with a clearly invalid/bogus Authorization
  //    token. We create a shallow clone of the authenticated connection
  //    and override the headers field so that we never mutate the
  //    original connection.headers in-place.
  const bogusTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      ...(connection.headers ?? {}),
      Authorization: "Bearer invalid.token.value",
    },
  };

  await TestValidator.error(
    "analytics access with bogus token must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.analytics.moderationAuditLogs.index(
        bogusTokenConnection,
        {
          body: requestBody,
        },
      );
    },
  );
}
