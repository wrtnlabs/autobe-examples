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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteSnapshot";
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

/**
 * Test that a vote owner can access vote snapshots for their own vote.
 * 1) Create member account. 2) Create community. 3) Subscribe to community.
 * 4) Create post. 5) Same member votes on their own post. 6) Vote owner
 * accesses vote snapshots for that vote.
 * Validate: Authorization passes, response contains paginated vote snapshots
 * with at least one snapshot for the vote. Filter by karma_impact range
 * (-1 to 1) should include the snapshot. Verify snapshot metadata includes
 * vote type and timestamp.
 */
export async function test_api_post_vote_snapshots_vote_owner_access(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Subscribe to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Create post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Vote on own post (upvote)
  const vote =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        body: {
          type: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(vote);
  // Access vote snapshots for that vote
  const snapshots =
    await api.functional.communityPlatform.member.posts.votes.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        voteId: vote.id,
        body: {
          karma_impact_min: -1 satisfies number as number,
          karma_impact_max: 1 satisfies number as number,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
          sort: "created_at_desc",
        } satisfies ICommunityPlatformPostVoteSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validate response
  TestValidator.equals(
    "snapshots pagination structure",
    snapshots.pagination.limit,
    10,
  );
  TestValidator.predicate("snapshots exist", snapshots.data.length > 0);
  const snapshot = snapshots.data[0];
  typia.assert(snapshot);
  TestValidator.predicate(
    "snapshot has vote type",
    () => snapshot.voteType === "upvote" || snapshot.voteType === "downvote",
  );
  TestValidator.equals(
    "snapshot karma impact for upvote",
    snapshot.karmaImpact,
    1,
  );
  TestValidator.predicate("snapshot has valid reason", () => {
    const validReasons = [
      "initial_vote",
      "vote_change",
      "vote_removal",
      "audit_capture",
    ];
    return validReasons.includes(snapshot.snapshotReason);
  });
  TestValidator.predicate("snapshot has timestamp", () => {
    return new Date(snapshot.createdAt).getTime() > 0;
  });
  TestValidator.equals("snapshot vote matches", snapshot.vote.id, vote.id);
  TestValidator.equals(
    "snapshot member matches",
    snapshot.member.id,
    member.id,
  );
  TestValidator.equals("snapshot post matches", snapshot.post.id, post.id);
}
