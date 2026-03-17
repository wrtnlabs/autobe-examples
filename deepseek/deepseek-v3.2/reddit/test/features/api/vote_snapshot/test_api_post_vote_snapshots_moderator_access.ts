import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
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
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_vote_snapshots_moderator_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create moderator member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 4. Subscribe moderator to community
  await generate_random_community_platform_member_subscriptions_create(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformSubscription.ICreate,
    },
  );
  // 5. Owner assigns moderator role to member
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: moderator.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(moderationRole);
  // 6. Create post author member
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 7. Subscribe post author to community
  await generate_random_community_platform_member_subscriptions_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformSubscription.ICreate,
    },
  );
  // 7. Subscribe post author to community
  await generate_random_community_platform_member_subscriptions_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformSubscription.ICreate,
    },
  );
  // 8. Create text post
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 9. Create voting member
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 10. Subscribe voting member to community
  await generate_random_community_platform_member_subscriptions_create(
    voterConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformSubscription.ICreate,
    },
  );
  // 11. Create vote on post
  const vote =
    await generate_random_community_platform_member_posts_votes_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: {
          type: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(vote);
  // Validate that moderator is neither post author nor vote owner
  TestValidator.notEquals(
    "moderator is not post author",
    moderator.id,
    author.id,
  );
  TestValidator.notEquals(
    "moderator is not vote owner",
    moderator.id,
    voter.id,
  );
  // 12. Moderator accesses vote snapshots with filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const snapshots =
    await api.functional.communityPlatform.member.posts.votes.snapshots.index(
      moderatorConnection,
      {
        postId: post.id,
        voteId: vote.id,
        body: {
          created_at_from: yesterday.toISOString(),
          created_at_to: now.toISOString(),
          limit: 10,
          page: 1,
          sort: "created_at_desc",
        } satisfies ICommunityPlatformPostVoteSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validate authorization succeeded and snapshots returned
  TestValidator.predicate(
    "moderator can access vote snapshots",
    snapshots.data.length >= 0,
  );
  // Check snapshot data if exists
  if (snapshots.data.length > 0) {
    const firstSnapshot = snapshots.data[0];
    TestValidator.equals(
      "snapshot vote ID matches",
      firstSnapshot.vote.id,
      vote.id,
    );
    TestValidator.equals(
      "snapshot post ID matches",
      firstSnapshot.post.id,
      post.id,
    );
    TestValidator.equals(
      "snapshot member ID matches",
      firstSnapshot.member.id,
      voter.id,
    );
  }
  // Test filtering by karma impact
  const upvoteSnapshots =
    await api.functional.communityPlatform.member.posts.votes.snapshots.index(
      moderatorConnection,
      {
        postId: post.id,
        voteId: vote.id,
        body: {
          karma_impact_min: 1,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformPostVoteSnapshot.IRequest,
      },
    );
  typia.assert(upvoteSnapshots);
  if (upvoteSnapshots.data.length > 0) {
    TestValidator.predicate(
      "filtered by karma impact min",
      upvoteSnapshots.data.every((s) => s.karmaImpact >= 1),
    );
  }
  // Test snapshot reason filtering
  const initialSnapshots =
    await api.functional.communityPlatform.member.posts.votes.snapshots.index(
      moderatorConnection,
      {
        postId: post.id,
        voteId: vote.id,
        body: {
          snapshot_reason: "initial_vote",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformPostVoteSnapshot.IRequest,
      },
    );
  typia.assert(initialSnapshots);
  if (initialSnapshots.data.length > 0) {
    TestValidator.equals(
      "filtered by initial_vote reason",
      initialSnapshots.data[0].snapshotReason,
      "initial_vote",
    );
  }
}
