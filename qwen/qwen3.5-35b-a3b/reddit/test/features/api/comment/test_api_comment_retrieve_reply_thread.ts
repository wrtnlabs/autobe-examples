import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_retrieve_reply_thread(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: typia.random<IRedditPlatformMember.IJoin>(),
    },
  );
  typia.assert(member);
  // 2. Create community
  const communityConnection: api.IConnection = { host: connection.host };
  const community: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1>>(),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription: IRedditPlatformCommunitySubscription =
    await generate_random_reddit_platform_member_communities_subscribe(
      communityConnection,
      {
        body: { confirmSubscription: true },
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create post in community
  const post: IRedditPlatformPost =
    await generate_random_reddit_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          postType: "TEXT",
          redditPlatformCommunityId: community.id,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(post);
  // 5. Create top-level comment (parent)
  const parentComment: IRedditPlatformComment =
    await generate_random_reddit_platform_member_comments_create(
      memberConnection,
      {
        body: {
          post_id: post.id,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(parentComment);
  // 6. Create reply comment referencing parent (post_id is null for replies)
  const replyComment: IRedditPlatformComment =
    await generate_random_reddit_platform_member_comments_create(
      memberConnection,
      {
        body: {
          post_id: null,
          parent_id: parentComment.id,
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(replyComment);
  // 7. Retrieve reply comment
  const retrievedComment: IRedditPlatformComment =
    await api.functional.redditPlatform.comments.at(memberConnection, {
      commentId: replyComment.id,
    });
  typia.assert(retrievedComment);
  // Validate parent object is present
  TestValidator.equals("parent exists", retrievedComment.parent !== null, true);
  
  // Assert parent is full comment type for accessing nested properties
  const parent = typia.assert<IRedditPlatformComment>(retrievedComment.parent!);
  
  // 8. Validate response
  TestValidator.equals(
    "comment id matches",
    retrievedComment.id,
    replyComment.id,
  );
  TestValidator.equals(
    "parent_id matches",
    retrievedComment.parent_id,
    parentComment.id,
  );
  TestValidator.equals(
    "content matches",
    retrievedComment.content,
    replyComment.content,
  );
  TestValidator.equals(
    "vote_score matches",
    retrievedComment.vote_score,
    replyComment.vote_score,
  );
  TestValidator.notEquals(
    "parent id is not null",
    parent.id,
    null,
  );
  TestValidator.equals(
    "parent id correct",
    parent.id,
    parentComment.id,
  );
  TestValidator.equals(
    "parent content matches",
    parent.content,
    parentComment.content,
  );
  TestValidator.equals(
    "parent vote_score matches",
    parent.vote_score,
    parentComment.vote_score,
  );
  // Validate author in parent
  TestValidator.equals(
    "parent author matches",
    parent.author.id,
    parentComment.author.id,
  );
  TestValidator.equals(
    "parent author username matches",
    parent.author.username,
    parentComment.author.username,
  );
  // Validate post object is present (inherited from parent comment's post)
  TestValidator.equals("post exists", retrievedComment.post !== null, true);
  TestValidator.equals("post id matches", retrievedComment.post!.id, post.id);
  TestValidator.equals(
    "post title matches",
    retrievedComment.post!.title,
    post.title,
  );
  // Validate parent comment can be retrieved independently
  const parentWithPost: IRedditPlatformComment =
    await api.functional.redditPlatform.comments.at(memberConnection, {
      commentId: parentComment.id,
    });
  typia.assert(parentWithPost);
  TestValidator.equals(
    "parent post id matches",
    parentWithPost.post!.id,
    post.id,
  );
  TestValidator.equals(
    "parent post title matches",
    parentWithPost.post!.title,
    post.title,
  );
}