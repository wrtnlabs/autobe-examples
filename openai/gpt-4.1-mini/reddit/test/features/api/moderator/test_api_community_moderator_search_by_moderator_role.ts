import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_community_moderator_search_by_moderator_role(
  connection: api.IConnection,
) {
  // Moderator registration
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "validPassword123";

  const moderatorJoin: IRedditCommunityModerator.IJoin = {
    email: moderatorEmail,
    password: moderatorPassword,
    href: "https://reddit.example.com/join",
    referrer: "https://reddit.example.com",
  };

  const moderatorAuthorized: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoin,
    });
  typia.assert(moderatorAuthorized);

  // Moderator login
  const moderatorLogin: IRedditCommunityModerator.ILogin = {
    email: moderatorJoin.email,
    password: moderatorJoin.password,
    href: "https://reddit.example.com/login",
    referrer: "https://reddit.example.com",
  };

  const moderatorLogged: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLogin,
    });
  typia.assert(moderatorLogged);

  // Create a user to be a moderator user
  const userCreate: IRedditCommunityUser.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPassword123",
    href: "https://reddit.example.com/user/create",
    referrer: "https://reddit.example.com",
  };

  const user: IRedditCommunityUser =
    await api.functional.redditCommunity.users.create(connection, {
      body: userCreate,
    });
  typia.assert(user);

  // Extract date boundaries to use in filtering
  const createdAtFrom = new Date(
    Date.now() - 7 * 24 * 3600 * 1000,
  ).toISOString(); // 7 days ago
  const createdAtTo = new Date().toISOString();

  // Build the moderator search request with pagination, filtering, and sorting
  const searchRequest: IRedditCommunityModerator.IRequest = {
    // Filtering by the created user id to simulate filtering by moderator user
    user_id: user.user_id ?? null,
    // Range filter for creation timestamps
    created_at_from: createdAtFrom,
    created_at_to: createdAtTo,
    // Search text (using part of email local-part)
    search: moderatorEmail.split("@")[0],
    // Pagination
    page: 1,
    limit: 10,
    // Sorting
    sortBy: "created_at",
    sortOrder: "desc",
  };

  const pageResult: IPageIRedditCommunityModerator.ISummary =
    await api.functional.redditCommunity.moderator.moderators.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(pageResult);

  // Validate pagination information
  TestValidator.predicate(
    "pagination current page is 1",
    pageResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    pageResult.pagination.limit === 10,
  );

  // Validate that returned data's user_id matches filter or contains search string
  pageResult.data.forEach((moderator) => {
    typia.assert(moderator);
    TestValidator.predicate(
      "moderator user_id matches filter",
      moderator.user_id === user.user_id ||
        moderator.user_email.includes(searchRequest.search ?? ""),
    );
  });

  // Validate descending order by created_at
  for (let i = 1; i < pageResult.data.length; i++) {
    const prev = pageResult.data[i - 1].created_at;
    const curr = pageResult.data[i].created_at;
    TestValidator.predicate(`desc order: ${prev} >= ${curr}`, prev >= curr);
  }
}
