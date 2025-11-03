import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_user_posts_listing(connection: api.IConnection) {
  // 1. Register a new user and obtain authorization token
  const userCreateBody = {
    email: `user${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "securePassword123",
    href: "https://reddit.example.com/welcome",
    referrer: "https://reddit.example.com/",
  } satisfies IRedditCommunityUser.ICreate;

  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Create user record before querying posts
  const userCreatePayload = {
    email: authorizedUser.email,
    password: "securePassword123",
    href: "https://reddit.example.com/welcome",
    referrer: "https://reddit.example.com/",
  } satisfies IRedditCommunityUser.ICreate;

  const createdUser: IRedditCommunityUser =
    await api.functional.redditCommunity.users.create(connection, {
      body: userCreatePayload,
    });
  typia.assert(createdUser);

  // 3. Request posts by the user with pagination and filtering
  const requestBody: IRedditCommunityPost.IRequest = {
    page: 1,
    limit: 5,
    author_id: createdUser.user_id,
    status: "active",
  };

  const postsPage: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.user.users.posts.index(connection, {
      userId: createdUser.user_id,
      body: requestBody,
    });
  typia.assert(postsPage);

  // 4. Verify pagination information
  TestValidator.predicate(
    "pagination current page is positive integer",
    postsPage.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive integer",
    postsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative integer",
    postsPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative integer",
    postsPage.pagination.records >= 0,
  );

  // 5. Verify posts belong to the requested user and have correct status
  for (const post of postsPage.data) {
    typia.assert(post);
    TestValidator.equals(
      "post author id matches requested user id",
      post.author.id,
      createdUser.user_id,
    );
    TestValidator.equals("post status is active", post.status, "active");
  }
}
