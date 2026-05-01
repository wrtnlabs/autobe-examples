import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test that the original author can successfully edit their own comment's content.
 *
 * Creates a complete test environment with a registered member, community,
 * subscription, post, and top-level comment. After editing the comment with
 * new content, validates that only the content and updated_at timestamp are
 * modified — all structural fields (depth, vote_score, author, post, parent)
 * must remain unchanged from the original comment.
 *
 * 1. Register and authenticate a new member via authorize_member_join.
 * 2. Create a community and subscribe the member to it.
 * 3. Create a post in the subscribed community.
 * 4. Create a top-level comment on the post.
 * 5. Edit the comment with randomized new content.
 * 6. Validate content matches the updated text, updated_at differs from
 *    created_at (indicating the edit was recorded), and depth, vote_score,
 *    author ID, post ID, and parent reference are all preserved.
 */
export async function test_api_comment_edit_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe the member to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  // 5. Create a top-level comment on the post
  const comment = await generate_random_community_hub_posts_comments_create(
    memberConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  // 6. Edit the comment with new content
  const newContent = RandomGenerator.paragraph({ sentences: 3 });
  const updated = await api.functional.communityHub.comments.update(
    memberConnection,
    {
      commentId: comment.id,
      body: { content: newContent } satisfies ICommunityHubComment.IUpdate,
    },
  );
  typia.assert(updated);
  // 7. Validate that only content and updated_at changed
  TestValidator.equals("content updated", updated.content, newContent);
  TestValidator.notEquals(
    "updated_at reflects edit",
    updated.updated_at,
    updated.created_at,
  );
  TestValidator.equals("depth preserved", updated.depth, comment.depth);
  TestValidator.equals(
    "vote_score preserved",
    updated.vote_score,
    comment.vote_score,
  );
  TestValidator.equals(
    "author preserved",
    updated.author.id,
    comment.author.id,
  );
  TestValidator.equals("post preserved", updated.post.id, comment.post.id);
  TestValidator.equals("parent preserved", updated.parent, comment.parent);
}
