import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserSession";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_user_sessions_retrieval_by_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to obtain authorization and user details
  const userCreateBody = {
    email: RandomGenerator.name(1).replace(/\s+/g, "") + "@test.com",
    password: "P@ssw0rd123",
    ip: null,
    href: "https://example.com/home",
    referrer: "https://google.com",
  } satisfies IRedditCommunityUser.ICreate;

  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Retrieve a paginated and filtered list of login sessions for the registered user
  const requestBody: IRedditCommunityUserSession.IRequest = {
    page: 1,
    limit: 10,
    orderBy: "created_at",
    orderDirection: "desc",
  };

  const sessionsPage: IPageIRedditCommunityUserSession.ISummary =
    await api.functional.redditCommunity.user.users.sessions.index(connection, {
      userId: authorizedUser.id,
      body: requestBody,
    });
  typia.assert(sessionsPage);

  // Validations
  TestValidator.predicate(
    "sessionsPage data is an array",
    Array.isArray(sessionsPage.data),
  );
  TestValidator.predicate(
    "pagination current page matches request",
    sessionsPage.pagination.current === requestBody.page,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    sessionsPage.pagination.limit === requestBody.limit,
  );

  // Check sorting order by created_at descending
  for (let i = 0; i + 1 < sessionsPage.data.length; i++) {
    const currentDate = new Date(sessionsPage.data[i].created_at);
    const nextDate = new Date(sessionsPage.data[i + 1].created_at);
    TestValidator.predicate(
      `sessions are sorted descending by created_at at index ${i}`,
      currentDate.getTime() >= nextDate.getTime(),
    );
  }
}
