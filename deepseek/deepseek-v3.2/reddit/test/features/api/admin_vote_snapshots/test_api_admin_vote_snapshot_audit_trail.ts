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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

/**
 * Test admin's ability to retrieve vote snapshot audit trail for karma investigation.
 * Setup: create a community, post, and simulate vote lifecycle events
 * (upvote → downvote → vote removal) to generate multiple snapshots.
 * As admin, search for snapshots with filtering by karma impact range
 * (-2 to +2) and snapshot reason (vote_change, vote_removal).
 * Validate that snapshots correctly capture karma impact values:
 * +1 for initial upvote, -2 for upvote→downvote change, +1 for downvote removal.
 * Verify pagination metadata includes correct total count.
 * Ensure response includes member and post context for audit reference.
 */
export async function test_api_admin_vote_snapshot_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 3. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 4. Create post (TEXT type)
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
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
  // 5. Create initial upvote
  const upvote =
    await api.functional.communityPlatform.member.posts.votes.create(
      memberConnection,
      {
        postId: post.id,
        body: { type: "up" } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(upvote);
  // 6. Change vote to downvote
  const downvote =
    await api.functional.communityPlatform.member.posts.votes.putByPostidAndVoteid(
      memberConnection,
      {
        postId: post.id,
        voteId: upvote.id,
        body: { type: "down" } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(downvote);
  // 7. Remove vote entirely
  await api.functional.communityPlatform.member.post_votes.mine.erase(
    memberConnection,
    {
      postId: post.id,
    },
  );
  // 8. Admin searches for snapshots with filtering
  const searchResult =
    await api.functional.communityPlatform.admin.posts.votes.snapshots.index(
      adminConnection,
      {
        postId: post.id,
        voteId: upvote.id,
        body: {
          karma_impact_min: -2,
          karma_impact_max: 2,
          snapshot_reason: "vote_change" as const,
          page: 1,
          limit: 10,
          sort: "created_at_desc" as const,
        } satisfies ICommunityPlatformPostVoteSnapshot.IRequest,
      },
    );
  typia.assert(searchResult);
  // 9. Validate pagination metadata
  TestValidator.equals(
    "pagination records count",
    searchResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.equals(
    "pagination total pages",
    searchResult.pagination.pages,
    1,
  );
  // 10. Validate snapshot data
  TestValidator.equals("snapshot count", searchResult.data.length, 2);
  // Sort by creation time to get vote_change then vote_removal
  const sortedSnapshots = [...searchResult.data].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  // First snapshot should be vote_change
  TestValidator.equals(
    "first snapshot reason",
    sortedSnapshots[0].snapshotReason,
    "vote_change",
  );
  TestValidator.equals(
    "first snapshot karma impact",
    sortedSnapshots[0].karmaImpact,
    -2,
  );
  // Second snapshot should be vote_removal
  TestValidator.equals(
    "second snapshot reason",
    sortedSnapshots[1].snapshotReason,
    "vote_removal",
  );
  TestValidator.equals(
    "second snapshot karma impact",
    sortedSnapshots[1].karmaImpact,
    1,
  );
  // 11. Validate audit context
  for (const snapshot of searchResult.data) {
    TestValidator.equals("snapshot vote ID", snapshot.vote.id, upvote.id);
    TestValidator.equals("snapshot member ID", snapshot.member.id, member.id);
    TestValidator.equals("snapshot post ID", snapshot.post.id, post.id);
    TestValidator.predicate(
      "snapshot vote type is upvote or downvote",
      () => snapshot.voteType === "upvote" || snapshot.voteType === "downvote",
    );
  }
}
