import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityUserSession";

export async function test_api_user_session_search_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create a user account to generate sessions
  const userJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1)
        .replace(/[^a-zA-Z0-9_]/g, "")
        .substring(0, 20) || "user" + RandomGenerator.alphabets(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const joinedUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(joinedUser);

  // Step 2: Login as the user to create multiple sessions
  const loginBody1 = {
    email: userJoin.email,
    password: userJoin.password,
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumCommunityUser.ILogin;

  const loginResponse1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginBody1,
    });
  typia.assert(loginResponse1);

  // Create another session with different IP/referrer
  const loginBody2 = {
    email: userJoin.email,
    password: userJoin.password,
    ip: "192.168.1.100",
    href: "http://localhost:3000/dashboard",
    referrer: "http://localhost:3000/login",
  } satisfies ICommunityForumCommunityUser.ILogin;

  const loginResponse2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginBody2,
    });
  typia.assert(loginResponse2);

  // Step 3: Search user sessions with various filters
  // Test 1: Basic search with pagination
  const basicSearch: IPageICommunityForumCommunityUserSession.ISummary =
    await api.functional.communityForum.user.users.sessions.index(connection, {
      username: joinedUser.username,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityForumCommunityUserSession.IRequest,
    });
  typia.assert(basicSearch);
  TestValidator.predicate(
    "should return at least 2 sessions",
    basicSearch.pagination.records >= 2,
  );

  // Test 2: Search with IP filter
  const ipFilteredSearch: IPageICommunityForumCommunityUserSession.ISummary =
    await api.functional.communityForum.user.users.sessions.index(connection, {
      username: joinedUser.username,
      body: {
        page: 1,
        limit: 10,
        ip: "192.168.1.100",
      } satisfies ICommunityForumCommunityUserSession.IRequest,
    });
  typia.assert(ipFilteredSearch);
  TestValidator.predicate(
    "should return exactly 1 session for IP filter",
    ipFilteredSearch.pagination.records === 1,
  );

  // Test 3: Search with href filter
  const hrefFilteredSearch: IPageICommunityForumCommunityUserSession.ISummary =
    await api.functional.communityForum.user.users.sessions.index(connection, {
      username: joinedUser.username,
      body: {
        page: 1,
        limit: 10,
        href: "http://localhost:3000/dashboard",
      } satisfies ICommunityForumCommunityUserSession.IRequest,
    });
  typia.assert(hrefFilteredSearch);
  TestValidator.predicate(
    "should return exactly 1 session for href filter",
    hrefFilteredSearch.pagination.records === 1,
  );

  // Test 4: Search with referrer filter
  const referrerFilteredSearch: IPageICommunityForumCommunityUserSession.ISummary =
    await api.functional.communityForum.user.users.sessions.index(connection, {
      username: joinedUser.username,
      body: {
        page: 1,
        limit: 10,
        referrer: "http://localhost:3000/",
      } satisfies ICommunityForumCommunityUserSession.IRequest,
    });
  typia.assert(referrerFilteredSearch);
  TestValidator.predicate(
    "should return exactly 1 session for referrer filter",
    referrerFilteredSearch.pagination.records === 1,
  );

  // Test 5: Search with active_only filter
  const activeOnlySearch: IPageICommunityForumCommunityUserSession.ISummary =
    await api.functional.communityForum.user.users.sessions.index(connection, {
      username: joinedUser.username,
      body: {
        page: 1,
        limit: 10,
        active_only: true,
      } satisfies ICommunityForumCommunityUserSession.IRequest,
    });
  typia.assert(activeOnlySearch);
  TestValidator.predicate(
    "should return sessions when active_only is true",
    activeOnlySearch.pagination.records >= 1,
  );

  // Test 6: Search with sorting
  const sortedSearch: IPageICommunityForumCommunityUserSession.ISummary =
    await api.functional.communityForum.user.users.sessions.index(connection, {
      username: joinedUser.username,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
        order: "desc",
      } satisfies ICommunityForumCommunityUserSession.IRequest,
    });
  typia.assert(sortedSearch);
  TestValidator.predicate(
    "should return sessions with sorting",
    sortedSearch.pagination.records >= 1,
  );

  // Test 7: Search with pagination limits
  const paginatedSearch: IPageICommunityForumCommunityUserSession.ISummary =
    await api.functional.communityForum.user.users.sessions.index(connection, {
      username: joinedUser.username,
      body: {
        page: 1,
        limit: 1,
      } satisfies ICommunityForumCommunityUserSession.IRequest,
    });
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination should have correct limit",
    paginatedSearch.pagination.limit,
    1,
  );

  // Verify that we get different results on different pages
  const page2Search: IPageICommunityForumCommunityUserSession.ISummary =
    await api.functional.communityForum.user.users.sessions.index(connection, {
      username: joinedUser.username,
      body: {
        page: 2,
        limit: 1,
      } satisfies ICommunityForumCommunityUserSession.IRequest,
    });
  typia.assert(page2Search);

  // Test 8: Test with created_after and created_before filters
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneHourLater = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const timeFilteredSearch: IPageICommunityForumCommunityUserSession.ISummary =
    await api.functional.communityForum.user.users.sessions.index(connection, {
      username: joinedUser.username,
      body: {
        page: 1,
        limit: 10,
        created_after: oneHourAgo,
        created_before: oneHourLater,
      } satisfies ICommunityForumCommunityUserSession.IRequest,
    });
  typia.assert(timeFilteredSearch);
  TestValidator.predicate(
    "should return sessions within time range",
    timeFilteredSearch.pagination.records >= 1,
  );
}
