import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSecurityEvent";

/**
 * Ensure that platform-admin-only security event search endpoint enforces
 * authentication.
 *
 * This test verifies that the PATCH
 * /communityPlatform/platformAdmin/userSecurityEvents endpoint cannot be called
 * anonymously or from a connection that does not carry the platformAdmin admin
 * session, and that it works correctly when invoked with a valid platformAdmin
 * token.
 *
 * Business flow:
 *
 * 1. Register a new platform administrator using POST /auth/platformAdmin/join.
 *    This both creates the admin row and configures the SDK connection with an
 *    Authorization header via the returned IAuthorizationToken.
 * 2. Optionally create a sample account status via POST
 *    /communityPlatform/platformAdmin/accountStatuses to ensure that master
 *    data for account statuses exists (not strictly required for the search
 *    itself but keeps the admin environment realistic).
 * 3. Prepare a simple ICommunityPlatformUserSecurityEvent.IRequest body focusing
 *    on pagination (page=1, pageSize=10) without additional filters.
 * 4. Create an unauthenticated connection by cloning the base connection and
 *    resetting headers to an empty object; call the security events endpoint
 *    from this unauthenticated connection and assert that an error is thrown
 *    (representing an authorization failure).
 * 5. For a second negative path representing a non-admin actor, reuse another
 *    cloned connection without the admin Authorization header and again assert
 *    that calling the endpoint fails with an error. We cannot create true
 *    memberUser or moderator tokens because no such auth endpoints are
 *    available in the SDK for this test, so we model non-admin traffic as a
 *    connection that simply lacks platformAdmin credentials.
 * 6. Finally, call PATCH /communityPlatform/platformAdmin/userSecurityEvents with
 *    the original, admin-authenticated connection and assert that the call
 *    succeeds and returns a valid
 *    IPageICommunityPlatformUserSecurityEvent.ISummary structure.
 *
 * Validation strategy:
 *
 * - Use typia.assert() to validate the response payload structure for the success
 *   case (page summary + list of security event summaries).
 * - Use TestValidator.error() with async callbacks to ensure that the
 *   unauthenticated and non-admin-like connections cannot access the endpoint,
 *   without inspecting HTTP status codes explicitly.
 */
export async function test_api_user_security_events_requires_platform_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator; this will also wire the
  //    Authorization header on the provided connection through the SDK.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Optionally create a sample account status so that the platform has at
  //    least one account status definition configured. This is not required by
  //    the userSecurityEvents API contract but keeps the environment realistic.
  const statusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(6)}`,
    label: "Active (test)",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert(createdStatus);

  // 3. Prepare a simple search request for user security events. We focus on
  //    pagination fields and leave filters unspecified.
  const searchRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformUserSecurityEvent.IRequest;

  // 4. Attempt to call the endpoint without any Authorization header by using
  //    a cloned connection with empty headers. This simulates a completely
  //    unauthenticated caller and should result in an error.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated connection must not access userSecurityEvents",
    async () => {
      await api.functional.communityPlatform.platformAdmin.userSecurityEvents.index(
        unauthenticatedConnection,
        {
          body: searchRequest,
        },
      );
    },
  );

  // 5. Simulate a non-admin-like caller. Since we do not have member or
  //    moderator auth APIs in this test context, we again use a connection
  //    without the platformAdmin Authorization token to represent a caller
  //    lacking the required admin role. The behavior from the endpoint's
  //    perspective should remain an authorization failure.
  const nonAdminConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "non-admin-like connection must not access userSecurityEvents",
    async () => {
      await api.functional.communityPlatform.platformAdmin.userSecurityEvents.index(
        nonAdminConnection,
        {
          body: searchRequest,
        },
      );
    },
  );

  // 6. Call the endpoint with the authenticated platform admin connection and
  //    assert that it succeeds and returns a valid paginated summary of
  //    security events.
  const pageResult: IPageICommunityPlatformUserSecurityEvent.ISummary =
    await api.functional.communityPlatform.platformAdmin.userSecurityEvents.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(pageResult);
  typia.assert<IPage.IPagination>(pageResult.pagination);

  // Basic sanity checks on pagination values to ensure the endpoint behaved
  // like a normal paginated list.
  TestValidator.predicate(
    "current page index must be non-negative",
    pageResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "page size (limit) must be non-negative",
    pageResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total record count must be non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages must be non-negative",
    pageResult.pagination.pages >= 0,
  );
}
