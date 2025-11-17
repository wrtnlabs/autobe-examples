import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityUserSession";

export async function test_api_user_session_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create a user account to generate sessions
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "password123";
  const userUsername =
    RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
    "_" +
    RandomGenerator.alphaNumeric(5);

  const joinInput = {
    email: userEmail,
    password: userPassword,
    username: userUsername,
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinInput,
    });
  typia.assert(user);

  // Update connection with the token from join
  connection.headers = {
    ...connection.headers,
    Authorization: `Bearer ${user.token.access}`,
  };

  // Step 2: Authenticate as the user to create multiple sessions
  // Create multiple login attempts to generate different sessions

  // Create 5 sessions with different IPs and referrers
  for (let i = 0; i < 5; i++) {
    const loginInput = {
      email: userEmail,
      password: userPassword,
      username: userUsername,
      ip: `192.168.0.${Math.floor(Math.random() * 255)}`,
      href: `https://example.com/page${i}`,
      referrer: `https://referrer.com/source${i}`,
    } satisfies ICommunityForumCommunityUser.ILogin;

    const loginResponse: ICommunityForumCommunityUser.IAuthorized =
      await api.functional.auth.user.login(connection, {
        body: loginInput,
      });
    typia.assert(loginResponse);

    // Update connection with new token for subsequent requests
    connection.headers = {
      ...connection.headers,
      Authorization: `Bearer ${loginResponse.token.access}`,
    };
  }

  // Step 3: Test pagination functionality for user session search results

  // Test 1: Get first page with default limit
  const page1: IPageICommunityForumCommunityUserSession.ISummary =
    await api.functional.communityForum.user.users.sessions.index(connection, {
      username: userUsername,
      body: {
        page: 1,
        limit: 2,
      } satisfies ICommunityForumCommunityUserSession.IRequest,
    });
  typia.assert(page1);

  // Validate pagination structure
  TestValidator.equals(
    "pagination metadata should be present",
    {
      current: page1.pagination.current,
      limit: page1.pagination.limit,
      records: page1.pagination.records,
      pages: page1.pagination.pages,
    },
    {
      current: 1,
      limit: 2,
      records: page1.pagination.records,
      pages: Math.ceil(page1.pagination.records / 2),
    },
  );

  // Test 2: Get second page
  const page2: IPageICommunityForumCommunityUserSession.ISummary =
    await api.functional.communityForum.user.users.sessions.index(connection, {
      username: userUsername,
      body: {
        page: 2,
        limit: 2,
      } satisfies ICommunityForumCommunityUserSession.IRequest,
    });
  typia.assert(page2);

  // Test 3: Validate that we get different data on different pages
  TestValidator.notEquals(
    "page 1 and 2 should have different data",
    page1.data,
    page2.data,
  );

  // Test 4: Test with larger limit
  const largePage: IPageICommunityForumCommunityUserSession.ISummary =
    await api.functional.communityForum.user.users.sessions.index(connection, {
      username: userUsername,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityForumCommunityUserSession.IRequest,
    });
  typia.assert(largePage);

  // Test 5: Validate sorting by creation date (ascending)
  const sortedAsc: IPageICommunityForumCommunityUserSession.ISummary =
    await api.functional.communityForum.user.users.sessions.index(connection, {
      username: userUsername,
      body: {
        page: 1,
        limit: 5,
        sort: "created_at",
        order: "asc",
      } satisfies ICommunityForumCommunityUserSession.IRequest,
    });
  typia.assert(sortedAsc);

  // Test 6: Validate sorting by creation date (descending)
  const sortedDesc: IPageICommunityForumCommunityUserSession.ISummary =
    await api.functional.communityForum.user.users.sessions.index(connection, {
      username: userUsername,
      body: {
        page: 1,
        limit: 5,
        sort: "created_at",
        order: "desc",
      } satisfies ICommunityForumCommunityUserSession.IRequest,
    });
  typia.assert(sortedDesc);

  // Test 7: Validate that sorting works correctly (first item in asc should be last in desc)
  if (sortedAsc.data.length > 0 && sortedDesc.data.length > 0) {
    TestValidator.equals(
      "first item in ascending order should be last in descending order",
      sortedAsc.data[0].id,
      sortedDesc.data[sortedDesc.data.length - 1].id,
    );
  }

  // Test 8: Validate pagination metadata
  TestValidator.predicate(
    "current page should be 1 for first page",
    () => page1.pagination.current === 1,
  );

  TestValidator.predicate(
    "limit should be respected",
    () => page1.pagination.limit === 2,
  );

  TestValidator.predicate(
    "total pages should be calculated correctly",
    () =>
      page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );

  // Test 9: Validate edge case with page beyond available data
  const emptyPage: IPageICommunityForumCommunityUserSession.ISummary =
    await api.functional.communityForum.user.users.sessions.index(connection, {
      username: userUsername,
      body: {
        page: 100, // Way beyond available data
        limit: 5,
      } satisfies ICommunityForumCommunityUserSession.IRequest,
    });
  typia.assert(emptyPage);

  TestValidator.predicate(
    "empty page should have no data",
    () => emptyPage.data.length === 0,
  );

  TestValidator.predicate(
    "empty page should still have correct pagination metadata",
    () =>
      emptyPage.pagination.current === 100 &&
      emptyPage.pagination.limit === 5 &&
      emptyPage.pagination.records >= 0,
  );
}
