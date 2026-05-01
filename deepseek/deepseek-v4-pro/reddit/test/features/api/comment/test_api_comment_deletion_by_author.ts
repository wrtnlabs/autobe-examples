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
 * Test that a comment's author can successfully delete their own comment.
 *
 * Validates the complete comment deletion workflow by the original author.
 * First registers and authenticates a member, then creates a community,
 * subscribes to it, creates a post, and writes a top-level comment. Finally
 * deletes the comment as its author via the erase endpoint and verifies the
 * deletion completes without error.
 *
 * The system performs a soft-delete — the comment record is preserved for
 * moderation audit purposes with its deleted_at timestamp set. The parent
 * post's comment_count is decremented to reflect the removal. Child replies,
 * if any existed, would be orphaned by having their parent reference cleared.
 *
 * 1. Register and authenticate the member (author, community owner, subscriber).
 * 2. Create a new community owned by the member.
 * 3. Subscribe the member to the newly created community.
 * 4. Create a text post with zero initial comment count.
 * 5. Create a top-level comment and verify post comment count increments to 1.
 * 6. Delete the comment as its author via DELETE /communityHub/comments/{commentId}.
 * 7. Verify the deletion call succeeds without error.
 */
export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as the member
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
  // 3. Subscribe to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  TestValidator.equals("initial comment count", post.comment_count, 0);
  // 5. Create a top-level comment on the post
  const comment = await generate_random_community_hub_posts_comments_create(
    memberConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  TestValidator.equals(
    "comment count after creation",
    comment.post.comment_count,
    1,
  );
  // 6. Delete the comment as its author
  await api.functional.communityHub.comments.erase(memberConnection, {
    commentId: comment.id,
  });
}
