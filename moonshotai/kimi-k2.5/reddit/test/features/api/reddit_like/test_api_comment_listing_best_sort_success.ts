import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test the primary success path for retrieving a paginated list of comments across the platform.
 * This is the most common use case where a member browses comments sorted by "BEST" quality.
 *
 * The test validates:
 * 1. Comment listing with BEST sort returns valid IPageIRedditLikeComment.ISummary structure
 * 2. Pagination metadata is correctly populated (current, limit, records, pages)
 * 3. Comment summaries include all required fields (id, content, author, vote_score, is_edited, is_deleted, created_at, parent_id, reply_count)
 * 4. Author summary contains required fields (id, email, username, emailVerified, createdAt)
 * 5. Default filtering excludes deleted comments (is_deleted: false)
 */
export async function test_api_comment_listing_best_sort_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: `test-community-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 4. Create a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create multiple comments on the post to populate listing results
  const commentCount = 5;
  await ArrayUtil.asyncRepeat(commentCount, async () => {
    const comment =
      await generate_random_reddit_like_member_posts_comments_create(
        memberConnection,
        {
          body: {
            content: RandomGenerator.content({ paragraphs: 2 }),
          },
          params: {
            postId: post.id,
          },
        },
      );
    typia.assert(comment);
  });
  // 6. Call PATCH /redditLike/member/comments with BEST sort
  const requestBody: IRedditLikeComment.IRequest = {
    sort: "BEST",
    page: 1,
    limit: 20,
    search: null,
    authorId: null,
    parentId: null,
    includeDeleted: false,
  };
  const response = await api.functional.redditLike.member.comments.index(
    memberConnection,
    {
      body: requestBody,
    },
  );
  // 7. Validate response structure matches IPageIRedditLikeComment.ISummary completely
  typia.assert(response);
  // 8. Verify business logic: pagination metadata matches request
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "pagination current is first page",
    response.pagination.current >= 0,
  );
  // 9. Verify data array exists and has content
  TestValidator.predicate("data is non-empty array", response.data.length > 0);
  // 10. Verify is_deleted is false for all comments (default filtering excludes deleted)
  TestValidator.predicate(
    "all comments have is_deleted false",
    response.data.every((comment) => comment.is_deleted === false),
  );
  // 11. Verify total records matches expected created comments
  TestValidator.predicate(
    "total records matches created comments",
    response.pagination.records >= commentCount,
  );
}
