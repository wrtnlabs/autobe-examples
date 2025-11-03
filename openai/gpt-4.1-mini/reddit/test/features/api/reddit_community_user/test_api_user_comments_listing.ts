import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_user_comments_listing(
  connection: api.IConnection,
) {
  // 1. User registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);

  // Use /auth/user/join API to register and get authorized user with bearer token
  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password: password,
        href: "https://localhost/",
        referrer: "https://localhost/referrer",
        ip: null,
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(authorizedUser);

  // 2. Create reddit community user record
  const redditUser: IRedditCommunityUser =
    await api.functional.redditCommunity.users.create(connection, {
      body: {
        email: email,
        password: password,
        href: "https://localhost/",
        referrer: "https://localhost/referrer",
        ip: null,
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(redditUser);

  // 3. Request paginated comments listing for this user
  const paginationRequest: IRedditCommunityUser.IRequest = {
    page: 1,
    limit: 20,
    search: null,
    email: null,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IRedditCommunityUser.IRequest;

  const commentsPage: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.user.users.comments.index(connection, {
      userId: authorizedUser.id,
      body: paginationRequest,
    });
  typia.assert(commentsPage);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination limit should be less or equal 20",
    commentsPage.pagination.limit <= 20,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    commentsPage.pagination.current,
    1,
  );

  // Validate comment data array shape
  TestValidator.predicate(
    "comments data should be an array",
    Array.isArray(commentsPage.data),
  );

  // If there is at least one comment, validate its structure and ownership
  if (commentsPage.data.length > 0) {
    const firstComment = commentsPage.data[0];
    typia.assert(firstComment);
    TestValidator.equals(
      "comment author id should match userId",
      firstComment.author.id,
      authorizedUser.id,
    );
    TestValidator.predicate(
      "comment body should be non-empty string",
      typeof firstComment.body === "string" && firstComment.body.length > 0,
    );
    TestValidator.predicate(
      "comment created_at should be valid ISO date string",
      typeof firstComment.created_at === "string" &&
        !isNaN(Date.parse(firstComment.created_at)),
    );
  }

  // Additional test: test pagination and sorting behavior
  // Request second page explicitly - expecting same structure
  const secondPageRequest = {
    ...paginationRequest,
    page: 2,
  } satisfies IRedditCommunityUser.IRequest;

  const secondCommentsPage =
    await api.functional.redditCommunity.user.users.comments.index(connection, {
      userId: authorizedUser.id,
      body: secondPageRequest,
    });
  typia.assert(secondCommentsPage);

  TestValidator.equals(
    "second page pagination current should be 2",
    secondCommentsPage.pagination.current,
    2,
  );

  // Verify that sorting directions work, by requesting order_direction asc
  const ascSortRequest = {
    ...paginationRequest,
    order_direction: "asc",
  } satisfies IRedditCommunityUser.IRequest;

  const ascCommentsPage =
    await api.functional.redditCommunity.user.users.comments.index(connection, {
      userId: authorizedUser.id,
      body: ascSortRequest,
    });
  typia.assert(ascCommentsPage);

  TestValidator.equals(
    "pagination current page asc should be 1",
    ascCommentsPage.pagination.current,
    1,
  );

  // Optionally add more assertions based on business rules or comment counts
}
