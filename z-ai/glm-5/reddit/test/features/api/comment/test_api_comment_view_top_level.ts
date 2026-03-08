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

export async function test_api_comment_view_top_level(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Setup: Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Setup: Subscribe member to the community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // Setup: Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.content({ paragraphs: 3 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // Setup: Create a top-level comment on the post
  const commentContent = RandomGenerator.paragraph({ sentences: 5 });
  const createdComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: commentContent,
        },
      },
    );
  typia.assert(createdComment);
  // Execution: View the comment as a guest (no authentication)
  const guestConnection: api.IConnection = { host: connection.host };
  const comment = await api.functional.communityPlatform.posts.comments.at(
    guestConnection,
    {
      postId: post.id,
      commentId: createdComment.id,
    },
  );
  typia.assert(comment);
  // Validation: Verify comment fields
  TestValidator.equals("comment id matches", comment.id, createdComment.id);
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentContent,
  );
  TestValidator.predicate(
    "comment score is number",
    typeof comment.score === "number",
  );
  // Validation: Verify parent is null (top-level comment)
  TestValidator.equals(
    "parent is null for top-level comment",
    comment.parent,
    null,
  );
  // Validation: Verify deleted_at is null (active comment)
  TestValidator.equals(
    "deleted_at is null for active comment",
    comment.deleted_at,
    null,
  );
  // Validation: Verify author summary
  TestValidator.equals("author id matches", comment.author.id, member.id);
  TestValidator.equals(
    "author username matches",
    comment.author.username,
    member.username,
  );
  TestValidator.predicate(
    "author has display_name",
    typeof comment.author.display_name === "string",
  );
  TestValidator.predicate(
    "author has karma",
    typeof comment.author.karma === "number",
  );
  TestValidator.predicate(
    "author has created_at",
    typeof comment.author.created_at === "string",
  );
  // Validation: Verify post summary
  TestValidator.equals("post id matches", comment.post.id, post.id);
  TestValidator.equals("post title matches", comment.post.title, post.title);
  TestValidator.equals(
    "post contentType matches",
    comment.post.contentType,
    "text",
  );
  TestValidator.predicate(
    "post has score",
    typeof comment.post.score === "number",
  );
  TestValidator.predicate(
    "post has commentCount",
    typeof comment.post.commentCount === "number",
  );
  TestValidator.predicate(
    "post has createdAt",
    typeof comment.post.createdAt === "string",
  );
  // Validation: Verify timestamps are ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !isNaN(Date.parse(comment.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    !isNaN(Date.parse(comment.updated_at)),
  );
}
