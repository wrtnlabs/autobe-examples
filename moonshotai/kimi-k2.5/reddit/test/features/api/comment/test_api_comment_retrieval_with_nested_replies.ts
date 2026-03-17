import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_comment_retrieval_with_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 4. Create a post in the subscribed community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 5. Create a top-level comment on the post
  const topLevelComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          parentId: null,
        },
      },
    );
  typia.assert(topLevelComment);
  // 6. Create a reply comment under the top-level comment
  const replyComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          parentId: topLevelComment.id,
        },
      },
    );
  typia.assert(replyComment);
  // 7. Retrieve the top-level comment with nested replies
  const retrievedComment = await api.functional.redditLike.posts.comments.at(
    memberConnection,
    {
      postId: post.id,
      commentId: topLevelComment.id,
    },
  );
  typia.assert(retrievedComment);
  // 8. Validate business logic (typia.assert already validates types and formats)
  // parent is null for top-level comment
  TestValidator.equals(
    "parentId is null for top-level comment",
    retrievedComment.parentId,
    null,
  );
  // replies array contains the nested reply
  TestValidator.equals(
    "replies array has exactly one reply",
    retrievedComment.replies.length,
    1,
  );
  // Verify reply comment has correct parentId
  const reply = retrievedComment.replies[0]!;
  TestValidator.equals(
    "reply parentId references top-level comment",
    reply.parentId,
    topLevelComment.id,
  );
  // Verify IDs match
  TestValidator.equals(
    "retrieved comment id matches original",
    retrievedComment.id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "retrieved comment postId matches original post",
    retrievedComment.postId,
    post.id,
  );
}
