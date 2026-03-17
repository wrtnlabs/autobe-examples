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
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_comment_sorted_moderator_view_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {});
  typia.assert(moderator);
  // 2. Create member account for content creation
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 3. Create community as member
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 4. Subscribe to community as member
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 5. Create post as member
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create comments with nested structure
  const parentComment1 =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(parentComment1);
  const parentComment2 =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(parentComment2);
  // Create nested replies
  const reply1 = await generate_random_reddit_like_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
        parentId: parentComment1.id,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(reply1);
  const reply2 = await generate_random_reddit_like_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
        parentId: parentComment1.id,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(reply2);
  const nestedReply =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: reply1.id,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(nestedReply);
  // 7. Delete some comments
  await api.functional.redditLike.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: parentComment2.id,
    },
  );
  await api.functional.redditLike.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: reply1.id,
    },
  );
  // 8. Retrieve comments as moderator with includeDeleted: true
  const requestBody = {
    sort: "NEW" as const,
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    search: null,
    authorId: null,
    parentId: null,
    includeDeleted: true,
  } satisfies IRedditLikeComment.IRequest;
  const response =
    await api.functional.redditLike.moderator.posts.comments.sorted.index(
      moderatorConnection,
      {
        postId: post.id,
        body: requestBody,
      },
    );
  typia.assert(response);
  // 9. Validate response structure
  TestValidator.predicate(
    "Response has pagination",
    response.pagination !== null,
  );
  TestValidator.predicate(
    "Response has data array",
    Array.isArray(response.data),
  );
  // 10. Validate deleted comments appear in results
  const deletedComments = response.data.filter((c) => c.is_deleted === true);
  TestValidator.predicate(
    "Some comments are deleted",
    deletedComments.length > 0,
  );
  // 11. Verify specific deleted comments exist
  const deletedCommentIds = deletedComments.map((c) => c.id);
  TestValidator.predicate(
    "Deleted parentComment2 is in results",
    deletedCommentIds.includes(parentComment2.id),
  );
  TestValidator.predicate(
    "Deleted reply1 is in results",
    deletedCommentIds.includes(reply1.id),
  );
  // 12. Verify active comments also exist
  const activeComments = response.data.filter((c) => c.is_deleted === false);
  TestValidator.predicate("Active comments exist", activeComments.length > 0);
  // 13. Verify deleted comments preserve parent_id references (thread structure)
  const deletedReply = deletedComments.find((c) => c.id === reply1.id);
  if (deletedReply) {
    TestValidator.equals(
      "Deleted reply preserves parent_id",
      deletedReply.parent_id,
      parentComment1.id,
    );
  }
  // 14. Verify reply counts reflect total replies (including deleted)
  const parentComment1InResults = response.data.find(
    (c) => c.id === parentComment1.id,
  );
  if (parentComment1InResults) {
    // Should have 2 replies (reply1 which is deleted, and reply2 which is active)
    TestValidator.equals(
      "Parent comment has correct reply count",
      parentComment1InResults.reply_count,
      2,
    );
  }
  // 15. Validate pagination metadata
  TestValidator.equals("Current page is 1", response.pagination.current, 1);
  TestValidator.predicate("Limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "Total records includes deleted",
    response.pagination.records >=
      deletedComments.length + activeComments.length,
  );
}
