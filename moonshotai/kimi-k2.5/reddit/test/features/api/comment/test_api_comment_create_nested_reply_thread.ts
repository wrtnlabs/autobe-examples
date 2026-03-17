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

export async function test_api_comment_create_nested_reply_thread(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Create post in community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        ...prepare_random_reddit_like_post(),
        community_id: community.id,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create top-level comment on the post
  const topLevelComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          ...prepare_random_reddit_like_comment(),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  // 6. Create nested reply comment referencing the top-level comment as parent
  const nestedReply =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          ...prepare_random_reddit_like_comment(),
          parentId: topLevelComment.id,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(nestedReply);
  // 7. Validate nested reply structure and parent reference
  TestValidator.equals(
    "nested reply parent_id matches top-level comment id",
    nestedReply.parentId,
    topLevelComment.id,
  );
  TestValidator.equals(
    "nested reply post_id matches original post id",
    nestedReply.postId,
    post.id,
  );
  TestValidator.predicate(
    "nested reply is not null",
    nestedReply.parent !== null,
  );
  if (nestedReply.parent !== null) {
    TestValidator.equals(
      "parent summary id matches top-level comment id",
      nestedReply.parent.id,
      topLevelComment.id,
    );
  }
  // 8. Verify nested reply's replies array is empty (no deeper nesting yet)
  TestValidator.equals(
    "nested reply has empty replies array",
    nestedReply.replies.length,
    0,
  );
  // 9. Verify the nested reply is created by the authenticated member
  TestValidator.equals(
    "nested reply author matches authenticated member",
    nestedReply.authorId,
    member.id,
  );
}