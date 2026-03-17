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

export async function test_api_comment_sorted_threaded_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 4. Create a post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 5. Create a parent comment (top-level, no parentId)
  const parentComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: "This is the parent comment for threaded testing",
          parentId: null,
        },
      },
    );
  typia.assert(parentComment);
  // 6. Create a reply comment (with parentId referencing the parent comment)
  const replyComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: "This is a reply to the parent comment",
          parentId: parentComment.id,
        },
      },
    );
  typia.assert(replyComment);
  // Test execution: First call - get top-level comments (parentId=null)
  const topLevelComments: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.member.posts.comments.sorted.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "BEST",
          page: 1,
          limit: 20,
          search: null,
          authorId: null,
          parentId: null,
          includeDeleted: false,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(topLevelComments);
  // Validation: Top-level view should only contain the parent comment, not the reply
  TestValidator.predicate(
    "top-level comments should not include replies",
    topLevelComments.data.every((comment) => comment.parent_id === null),
  );
  // Find parent comment in top-level results
  const parentInResults = topLevelComments.data.find(
    (c) => c.id === parentComment.id,
  );
  TestValidator.predicate(
    "parent comment should exist in top-level view",
    parentInResults !== undefined,
  );
  // Validate reply_count on parent comment
  if (parentInResults) {
    TestValidator.equals(
      "parent comment reply_count should be 1",
      parentInResults.reply_count,
      1,
    );
  }
  // Test execution: Second call - get replies to the parent comment
  const replyComments: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.member.posts.comments.sorted.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "BEST",
          page: 1,
          limit: 20,
          search: null,
          authorId: null,
          parentId: parentComment.id,
          includeDeleted: false,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(replyComments);
  // Validation: Reply view should only contain the reply comment
  TestValidator.predicate(
    "reply view should only contain comments with matching parent_id",
    replyComments.data.every(
      (comment) => comment.parent_id === parentComment.id,
    ),
  );
  // Validate that the reply is in the results
  TestValidator.predicate(
    "reply comment should be in reply view",
    replyComments.data.some((c) => c.id === replyComment.id),
  );
  // Validate author information is populated
  TestValidator.predicate(
    "all comments have author information",
    topLevelComments.data.every(
      (comment) =>
        comment.author !== null &&
        comment.author.id !== undefined &&
        comment.author.username !== undefined,
    ),
  );
  // Validate reply comment has correct parent_id in its own data
  const replyInResults = replyComments.data.find(
    (c) => c.id === replyComment.id,
  );
  if (replyInResults) {
    TestValidator.equals(
      "reply comment should have correct parent_id",
      replyInResults.parent_id,
      parentComment.id,
    );
  }
}
