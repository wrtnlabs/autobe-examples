import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityUserSession";

export async function test_api_administrator_user_session_search(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "password123";
  const adminUsername = `admin-${RandomGenerator.alphaNumeric(6)}`;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    username: adminUsername,
  } satisfies ICommunityForumCommunityUser.IJoin;

  const adminUser = await api.functional.auth.user.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminUser);

  // Create administrator role
  const adminCreateBody = {
    community_forum_user_id: adminUser.id,
    role: "system_admin" as const,
  } satisfies ICommunityForumCommunityAdministrator.ICreate;

  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(adminAuth);

  // Update connection with admin authorization
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${adminAuth.token.access}`,
    },
  };

  // Step 2: Create regular user account
  const userEmail = `user-${RandomGenerator.alphaNumeric(8)}@example.com`;
  const userPassword = "password123";
  const userUsername = `user-${RandomGenerator.alphaNumeric(6)}`;

  const userJoinBody = {
    email: userEmail,
    password: userPassword,
    username: userUsername,
  } satisfies ICommunityForumCommunityUser.IJoin;

  const regularUser = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(regularUser);

  // Step 3: Generate multiple sessions for the user
  const ipAddresses = ["192.168.1.1", "10.0.0.1", "172.16.0.1"];
  const hrefs = [
    "https://example.com/page1",
    "https://example.com/page2",
    "https://example.com/page3",
  ];
  const referrers = [
    "https://google.com/search",
    "https://facebook.com/link",
    "https://twitter.com/tweet",
  ];

  // Login multiple times to create sessions
  for (let i = 0; i < 5; i++) {
    const loginBody = {
      email: userEmail,
      password: userPassword,
      ip: ipAddresses[i % ipAddresses.length],
      href: hrefs[i % hrefs.length],
      referrer: referrers[i % referrers.length],
    } satisfies ICommunityForumCommunityUser.ILogin;

    await api.functional.auth.user.login(connection, {
      body: loginBody,
    });
  }

  // Step 4: Test administrator session search with various filters

  // Test 1: Basic search with pagination
  const basicSearch =
    await api.functional.communityForum.administrator.users.sessions.index(
      adminConnection,
      {
        username: regularUser.username,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityForumCommunityUserSession.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.predicate(
    "basic search returns pagination info",
    () =>
      basicSearch.pagination.current === 1 &&
      basicSearch.pagination.limit === 10 &&
      basicSearch.pagination.records >= 0,
  );

  // Test 2: Search with IP filter
  const ipFilteredSearch =
    await api.functional.communityForum.administrator.users.sessions.index(
      adminConnection,
      {
        username: regularUser.username,
        body: {
          page: 1,
          limit: 10,
          ip: ipAddresses[0],
        } satisfies ICommunityForumCommunityUserSession.IRequest,
      },
    );
  typia.assert(ipFilteredSearch);

  // Test 3: Search with href filter
  const hrefFilteredSearch =
    await api.functional.communityForum.administrator.users.sessions.index(
      adminConnection,
      {
        username: regularUser.username,
        body: {
          page: 1,
          limit: 10,
          href: hrefs[0],
        } satisfies ICommunityForumCommunityUserSession.IRequest,
      },
    );
  typia.assert(hrefFilteredSearch);

  // Test 4: Search with referrer filter
  const referrerFilteredSearch =
    await api.functional.communityForum.administrator.users.sessions.index(
      adminConnection,
      {
        username: regularUser.username,
        body: {
          page: 1,
          limit: 10,
          referrer: referrers[0],
        } satisfies ICommunityForumCommunityUserSession.IRequest,
      },
    );
  typia.assert(referrerFilteredSearch);

  // Test 5: Search with time range filters
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const timeFilteredSearch =
    await api.functional.communityForum.administrator.users.sessions.index(
      adminConnection,
      {
        username: regularUser.username,
        body: {
          page: 1,
          limit: 10,
          created_after: oneHourAgo.toISOString(),
          created_before: oneHourLater.toISOString(),
        } satisfies ICommunityForumCommunityUserSession.IRequest,
      },
    );
  typia.assert(timeFilteredSearch);

  // Test 6: Search with active_only filter
  const activeOnlySearch =
    await api.functional.communityForum.administrator.users.sessions.index(
      adminConnection,
      {
        username: regularUser.username,
        body: {
          page: 1,
          limit: 10,
          active_only: true,
        } satisfies ICommunityForumCommunityUserSession.IRequest,
      },
    );
  typia.assert(activeOnlySearch);

  // Test 7: Search with sorting
  const sortedSearch =
    await api.functional.communityForum.administrator.users.sessions.index(
      adminConnection,
      {
        username: regularUser.username,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies ICommunityForumCommunityUserSession.IRequest,
      },
    );
  typia.assert(sortedSearch);

  // Test 8: Search with pagination (multiple pages)
  const page1 =
    await api.functional.communityForum.administrator.users.sessions.index(
      adminConnection,
      {
        username: regularUser.username,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityForumCommunityUserSession.IRequest,
      },
    );
  typia.assert(page1);

  if (page1.pagination.records > 2) {
    const page2 =
      await api.functional.communityForum.administrator.users.sessions.index(
        adminConnection,
        {
          username: regularUser.username,
          body: {
            page: 2,
            limit: 2,
          } satisfies ICommunityForumCommunityUserSession.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.predicate(
      "pagination returns correct page numbers",
      () => page1.pagination.current === 1 && page2.pagination.current === 2,
    );
  }

  // Step 5: Verify unauthorized access is properly rejected

  // Try to access session search without authorization (should fail)
  await TestValidator.error(
    "unauthorized access without token is rejected",
    async () => {
      await api.functional.communityForum.administrator.users.sessions.index(
        connection,
        {
          username: regularUser.username,
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityForumCommunityUserSession.IRequest,
        },
      );
    },
  );

  // Try to access with invalid/expired token (should fail)
  const invalidConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: "Bearer invalid-token",
    },
  };

  await TestValidator.error(
    "unauthorized access with invalid token is rejected",
    async () => {
      await api.functional.communityForum.administrator.users.sessions.index(
        invalidConnection,
        {
          username: regularUser.username,
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityForumCommunityUserSession.IRequest,
        },
      );
    },
  );
}
