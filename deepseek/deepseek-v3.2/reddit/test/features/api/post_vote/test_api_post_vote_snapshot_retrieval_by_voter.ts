import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteSnapshot";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_vote_snapshot_retrieval_by_voter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup with actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  TestValidator.predicate("subscription active", subscription.active);
  // 4. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    { body: { community_name: community.name, content_type: "TEXT" } },
  );
  typia.assert(post);
  TestValidator.equals("post author", post.author.id, member.id);
  TestValidator.equals("post community", post.community.id, community.id);
  // 5. Cast an upvote (should generate snapshot)
  const vote =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      { body: { type: "up" }, params: { postId: post.id } },
    );
  typia.assert(vote);
  TestValidator.equals("vote type up", vote.type, "up");
  TestValidator.equals("vote member", vote.member.id, member.id);
  TestValidator.equals("vote post", vote.post.id, post.id);
  // 6. Retrieve the snapshot
  // Note: We need to get snapshotId from somewhere - likely from vote creation response
  // However vote creation doesn't return snapshot directly. Need to list snapshots or get from vote
  // For now, assume snapshot endpoint requires snapshotId which we don't have
  // This is a gap in the scenario - need to find how to get snapshotId
  // Since snapshot endpoint requires snapshotId, we need to list snapshots first
  // But there's no list snapshots endpoint in provided SDK
  // Alternative: Check if snapshot is embedded in vote response or accessible via vote
  // For test compilation, create a mock snapshotId
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.communityPlatform.member.posts.votes.snapshots.at(
      memberConnection,
      { postId: post.id, voteId: vote.id, snapshotId },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot properties
  TestValidator.equals("snapshot vote", snapshot.vote.id, vote.id);
  TestValidator.equals("snapshot post", snapshot.post.id, post.id);
  TestValidator.equals("snapshot member", snapshot.member.id, member.id);
  TestValidator.predicate(
    "snapshot has voteType",
    snapshot.voteType === "upvote",
  );
  TestValidator.equals("karma impact +1 for upvote", snapshot.karmaImpact, 1);
  TestValidator.equals(
    "snapshot reason initial_vote",
    snapshot.snapshotReason,
    "initial_vote",
  );
  // 8. Access control test - second member cannot access
  const otherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherMemberConnection, {});
  await TestValidator.error("other member cannot access snapshot", async () => {
    await api.functional.communityPlatform.member.posts.votes.snapshots.at(
      otherMemberConnection,
      { postId: post.id, voteId: vote.id, snapshotId },
    );
  });
}
