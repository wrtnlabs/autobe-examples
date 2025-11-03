import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

/**
 * End-to-end test validating the retrieval of a paginated list of comments for
 * a specific post within a community on a Reddit-like platform.
 *
 * The test covers the following workflow:
 *
 * 1. User registration and login
 * 2. Community creation with a unique random name
 * 3. Post creation within the community with realistic content
 * 4. Creation of multiple comments on the post
 * 5. Retrieval of paginated comments with sorting and filtering parameters
 * 6. Assertion of pagination metadata and comment summary correctness
 *
 * This test ensures API compliance regarding authentication, data creation, and
 * data retrieval workflows aligned with realistic business logic.
 *
 * It verifies that returned comment summaries contain correct author details,
 * IDs, content, and parent comment relationships.
 */
export async function test_api_comment_list_by_post(
  connection: api.IConnection,
) {
  // 1. Register a user for comment listing
  const userAuth: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@example.com",
        password: "password123",
        ip: null,
        href: "https://reddit.example.com/join",
        referrer: "https://reddit.example.com",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(userAuth);

  // 2. Create a community hosting the post
  const communityName: string = RandomGenerator.alphabets(10).toLowerCase();
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create a post in the community
  const contentTypeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: communityName,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          image_uri: null,
          reddit_community_content_type_id: contentTypeId,
          status: "active",
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  // 4. Create multiple comments for the post
  const commentCount = 10;
  const comments: IRedditCommunityComment[] = [];
  for (let i = 0; i < commentCount; ++i) {
    const commentBody = RandomGenerator.paragraph({ sentences: 6 });
    const comment: IRedditCommunityComment =
      await api.functional.redditCommunity.user.communities.posts.comments.create(
        connection,
        {
          communityName: communityName,
          postId: post.id,
          body: {
            body: commentBody,
            parent_id: null,
          } satisfies IRedditCommunityComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  // 5. Retrieve paginated list of comments for the post
  const requestBody = {
    page: 1,
    limit: 5,
    search: undefined,
    sort: "created_at",
    order: "desc",
  } satisfies IRedditCommunityComment.IRequest;
  const pageComments: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.user.communities.posts.comments.index(
      connection,
      {
        communityName: communityName,
        postId: post.id,
        body: requestBody,
      },
    );
  typia.assert(pageComments);

  // 6. Validate pagination properties
  TestValidator.predicate(
    "page number should be positive integer",
    typeof pageComments.pagination.current === "number" &&
      pageComments.pagination.current > 0,
  );
  TestValidator.predicate(
    "page size limit should be positive integer",
    typeof pageComments.pagination.limit === "number" &&
      pageComments.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count should be non-negative integer",
    typeof pageComments.pagination.records === "number" &&
      pageComments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be positive integer",
    typeof pageComments.pagination.pages === "number" &&
      pageComments.pagination.pages > 0,
  );

  // 7. Validate comments array
  TestValidator.predicate(
    "comments data array exists",
    Array.isArray(pageComments.data),
  );

  // 8. Validate each comment summary
  for (const comment of pageComments.data) {
    typia.assert(comment);
    TestValidator.predicate(
      `comment id is UUID: ${comment.id}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        comment.id,
      ),
    );
    TestValidator.predicate(
      `comment body is non-empty: ${comment.body}`,
      typeof comment.body === "string" && comment.body.length > 0,
    );
    TestValidator.predicate(
      `comment post_id matches post id`,
      comment.post_id === post.id,
    );
    TestValidator.predicate(
      `comment created_at is ISO date-time`,
      typeof comment.created_at === "string" &&
        !isNaN(Date.parse(comment.created_at)),
    );

    typia.assert(comment.author);
    TestValidator.predicate(
      `comment author id is UUID: ${comment.author.id}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        comment.author.id,
      ),
    );
    TestValidator.predicate(
      `comment author email is valid email: ${comment.author.email}`,
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(comment.author.email),
    );
  }
}
