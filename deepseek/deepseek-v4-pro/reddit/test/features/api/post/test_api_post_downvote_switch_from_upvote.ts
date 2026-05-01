import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import type { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
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
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test switching a member's vote on a post from upvote to downvote.
 *
 * Validates the complete vote-switching workflow: a member registers, creates a community, subscribes, creates a post, upvotes it, then switches to a downvote. The test verifies that the vote record is updated in-place rather than deleted and recreated.
 *
 * Key validations confirm that the vote ID remains identical across the switch, the value changes from 1 (upvote) to -1 (downvote), the original creation timestamp is preserved, and the update timestamp reflects the moment of the switch.
 *
 * 1. Member registers and authenticates via join.
 * 2. Creates a community and subscribes to it.
 * 3. Creates a text post within the community.
 * 4. Upvotes the post — establishes the initial vote record.
 * 5. Downvotes the same post — switches the existing upvote to a downvote.
 * 6. Validates vote ID preservation, value switch, timestamp behavior.
 */
export async function test_api_post_downvote_switch_from_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
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
  await api.functional.communityHub.member.communities.subscriptions.create(
    memberConnection,
    { communityName: community.name },
  );
  // 4. Create a text post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  // 5. Upvote the post
  const upvoteVote = await api.functional.communityHub.member.posts.upvote(
    memberConnection,
    { postId: post.id },
  );
  typia.assert(upvoteVote);
  // 6. Switch to downvote
  const downvoteVote = await api.functional.communityHub.member.posts.downvote(
    memberConnection,
    { postId: post.id },
  );
  typia.assert(downvoteVote);
  // 7. Validate vote record
  TestValidator.equals("vote id preserved", downvoteVote.id, upvoteVote.id);
  TestValidator.equals("vote value switched to -1", downvoteVote.value, -1);
  TestValidator.equals(
    "created_at preserved",
    downvoteVote.created_at,
    upvoteVote.created_at,
  );
  TestValidator.notEquals(
    "updated_at reflects switch",
    downvoteVote.updated_at,
    upvoteVote.updated_at,
  );
}
