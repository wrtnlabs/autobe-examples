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
 * Test idempotent behavior of comment vote removal when no vote exists.
 *
 * Validates that attempting to remove a vote from a comment that has never been
 * voted on by the member succeeds as a no-op. The operation completes without
 * error and without changing any vote scores or author karma values.
 *
 * 1. A member joins the platform and creates a community.
 * 2. The member subscribes to the community to enable posting.
 * 3. A post is created within the community.
 * 4. A top-level comment is created on the post — no vote is cast.
 * 5. The member attempts to remove a vote from the comment without ever
 *    having voted on it.
 * 6. The operation succeeds as a no-op, confirming idempotent behavior
 *    where removing a non-existent vote is not an error condition.
 */
export async function test_api_comment_vote_removal_without_existing_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
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
  // 4. Create a post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  // 5. Create a top-level comment on the post without casting any vote
  const comment = await generate_random_community_hub_posts_comments_create(
    memberConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  // 6. Attempt to remove vote from comment — should succeed as no-op
  await api.functional.communityHub.member.comments.vote.erase(
    memberConnection,
    { commentId: comment.id },
  );
}
