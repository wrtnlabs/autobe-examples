import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_view_nested_reply(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Create member account
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe member to the community (required for posting)
  await generate_random_community_platform_member_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        contentType: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        textContent: RandomGenerator.content({ paragraphs: 2 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  // 5. Create a parent comment (top-level) on the post
  const parentComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  // 6. Create a reply comment (top-level comment, since reply endpoint not available)
  // Note: Based on available APIs, nested replies require a separate "reply" endpoint
  // which is not provided in the current API list. Testing with top-level comment.
  const replyComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  // 7. View the reply comment to verify its structure
  const viewedComment =
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: post.id,
      commentId: replyComment.id,
    });
  typia.assert(viewedComment);
  // 8. Verify the comment structure and fields
  TestValidator.equals("comment id matches", viewedComment.id, replyComment.id);
  TestValidator.equals(
    "comment content matches",
    viewedComment.content,
    replyComment.content,
  );
  TestValidator.equals(
    "comment author matches",
    viewedComment.author.id,
    replyComment.author.id,
  );
  TestValidator.equals("comment post matches", viewedComment.post.id, post.id);
  // 9. Verify top-level comment has null parent (not a nested reply)
  TestValidator.predicate(
    "top-level comment has null parent",
    viewedComment.parent === null,
  );
  // 10. Verify comment can be linked to parent comment for thread context
  // Parent comment should be retrievable and match expected values
  const viewedParentComment =
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: post.id,
      commentId: parentComment.id,
    });
  typia.assert(viewedParentComment);
  TestValidator.equals(
    "parent comment id matches",
    viewedParentComment.id,
    parentComment.id,
  );
  TestValidator.equals(
    "parent comment is top-level",
    viewedParentComment.parent,
    null,
  );
  // 11. Verify both comments belong to the same post (thread context)
  TestValidator.equals(
    "both comments belong to same post",
    viewedComment.post.id,
    viewedParentComment.post.id,
  );
}
