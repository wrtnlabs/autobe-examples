import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDefaultFeed";

/**
 * Verify that searching default feed configurations is restricted to platform
 * administrators.
 *
 * Business goal:
 *
 * - Ensure that the PATCH /communityPlatform/platformAdmin/defaultFeeds search
 *   endpoint can only be used by callers authenticated as platform admins.
 * - Confirm that unauthenticated requests and memberUser-authenticated requests
 *   cannot successfully retrieve default feed search results.
 * - Confirm that a properly authenticated platformAdmin can perform the search
 *   and receive a well-typed, paginated page of
 *   ICommunityPlatformDefaultFeed.ISummary.
 *
 * Scenario steps:
 *
 * 1. Prepare a simple, deterministic default feed search request body using
 *    ICommunityPlatformDefaultFeed.IRequest (for example, page and pageSize
 *    only).
 * 2. Using a connection with no Authorization header, invoke
 *    api.functional.communityPlatform.platformAdmin.defaultFeeds.index and
 *    expect the call to fail (authorization required). Use TestValidator.error
 *    to assert that the call does not succeed.
 * 3. Register a member user via api.functional.auth.memberUser.join and rely on
 *    SDK behavior to set the Authorization header for the connection.
 * 4. With the memberUser-authenticated connection, invoke the same defaultFeeds
 *    index API and again assert that the call fails via TestValidator.error,
 *    demonstrating that non-admin actors cannot use platformAdmin endpoints.
 * 5. Register a platform administrator via api.functional.auth.platformAdmin.join.
 *    The SDK will automatically update the connection Authorization header to a
 *    platformAdmin token.
 * 6. With the platformAdmin-authenticated connection, invoke the
 *    communityPlatform.platformAdmin.defaultFeeds.index API using the same
 *    search request body and assert that the call succeeds.
 * 7. Validate the response shape using typia.assert to ensure it matches
 *    IPageICommunityPlatformDefaultFeed.ISummary and then add basic business
 *    assertions on pagination metadata (for example, page and limit values echo
 *    the request inputs) using TestValidator.equals.
 */
export async function test_api_platform_admin_default_feeds_search_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Build a simple search request body (page and pageSize only)
  const requestBody = {
    page: 1,
    pageSize: 10,
  } satisfies ICommunityPlatformDefaultFeed.IRequest;

  // Helper to clone a connection with cleared headers for unauthenticated tests
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Unauthenticated request: must fail due to missing admin authentication
  await TestValidator.error(
    "unauthenticated defaultFeeds search must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.defaultFeeds.index(
        unauthenticatedConnection,
        { body: requestBody },
      );
    },
  );

  // 3. Register a memberUser and authenticate connection as memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join/member",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. MemberUser-authenticated connection: still must not be able to use
  //    platformAdmin-only defaultFeeds search endpoint
  await TestValidator.error(
    "memberUser-authenticated defaultFeeds search must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.defaultFeeds.index(
        connection,
        { body: requestBody },
      );
    },
  );

  // 5. Register a platform administrator; this updates connection Authorization
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    href: "https://example.com/join/admin",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 6. PlatformAdmin-authenticated connection: search should now succeed
  const page: IPageICommunityPlatformDefaultFeed.ISummary =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page);

  // 7. Basic business assertions on pagination metadata
  TestValidator.equals(
    "pagination.current should reflect requested page when configured",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should reflect requested pageSize when configured",
    page.pagination.limit,
    10,
  );
}
