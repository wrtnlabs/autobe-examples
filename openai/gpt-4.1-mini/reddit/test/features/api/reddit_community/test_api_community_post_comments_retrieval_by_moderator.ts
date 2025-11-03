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
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_community_post_comments_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator user joins and authenticates
  const moderatorJoinBody = {
    email: `mod${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "SecurePass123!",
    ip: null,
    href: "https://example.com/moderator-join",
    referrer: "https://example.com/",
  } satisfies IRedditCommunityModerator.IJoin;
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 2. Ordinary user joins and authenticates to create community and post
  const userJoinBody = {
    email: `user${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "SecurePass123!",
    ip: null,
    href: "https://example.com/user-join",
    referrer: "https://example.com/",
  } satisfies IRedditCommunityUser.ICreate;
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);

  // 3. User creates a community
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 4. User creates a post in the community
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    image_uri: null,
    reddit_community_content_type_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 5. As authenticated moderator, retrieve paginated comment list for the post
  // Prepare request for paginated comments - page 1, limit 10, sort by created_at descending
  const commentRequestBody = {
    page: 1,
    limit: 10,
    sort: "created_at",
    order: "desc",
  } satisfies IRedditCommunityComment.IRequest;

  const commentPage: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.moderator.communities.posts.comments.index(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: commentRequestBody,
      },
    );
  typia.assert(commentPage);

  // Validation: Assert pagination info properties are valid and positive numbers
  TestValidator.predicate(
    "pagination current page is positive",
    commentPage.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    commentPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    commentPage.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    commentPage.pagination.records >= 0,
  );

  // Validation: For each comment, check it belongs to the post and community by the post_id & author id presence
  for (const comment of commentPage.data) {
    TestValidator.equals(
      "comment belongs to correct post",
      comment.post_id,
      post.id,
    );
    // The author must have an id and email defined
    typia.assert(comment.author);
    TestValidator.predicate(
      "author id is non-empty string",
      typeof comment.author.id === "string" && comment.author.id.length > 0,
    );
    TestValidator.predicate(
      "author email is valid string",
      typeof comment.author.email === "string" &&
        comment.author.email.length > 0,
    );
    TestValidator.predicate(
      "comment body is non-empty",
      typeof comment.body === "string" && comment.body.length > 0,
    );
    // parent_id is either string or null or undefined, no check needed
  }
}
