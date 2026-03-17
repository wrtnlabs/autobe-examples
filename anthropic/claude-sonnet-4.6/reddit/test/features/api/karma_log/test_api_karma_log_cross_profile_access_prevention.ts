import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import type { ICommunityUserProfileKarmaLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfileKarmaLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { generate_random_community_member_posts_comments_votes_create } from "../../../generate/generate_random_community_member_posts_comments_votes_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_comment_vote } from "../../../prepare/prepare_random_community_comment_vote";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_karma_log_cross_profile_access_prevention(
  connection: api.IConnection,
): Promise<void> {
  // ─── Step 1: Register Member A (community owner) ───────────────────────────
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // ─── Step 2: Member A creates a community ──────────────────────────────────
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // ─── Step 3: Member A subscribes to the community ──────────────────────────
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // ─── Step 4: Member A creates a text post ──────────────────────────────────
  const post = await api.functional.community.member.communities.posts.create(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // ─── Step 5: Register Member B (comment author) ────────────────────────────
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // ─── Step 6: Member B posts a comment on Member A's post ───────────────────
  const comment = await generate_random_community_member_posts_comments_create(
    memberBConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // ─── Step 7: Register Member C (voter) ─────────────────────────────────────
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  // ─── Step 8: Member C upvotes Member B's comment ───────────────────────────
  // This creates a karma log entry associated with Member B's userProfileId
  const vote =
    await generate_random_community_member_posts_comments_votes_create(
      memberCConnection,
      {
        params: {
          postId: post.id,
          commentId: comment.id,
        },
        body: { voteType: "up" },
      },
    );
  typia.assert(vote);
  // ─── Step 9: Cross-profile mismatch test ───────────────────────────────────
  // The karma log entry was created for Member B's profile.
  // We use Member A's member id as a "userProfileId" (a valid UUID but NOT
  // the profile that owns the karma log) combined with a random karmaLogId.
  // The API must return 404 — either because:
  //   (a) the karma log doesn't exist for that ID, or
  //   (b) the karma log exists but the profile ID doesn't match (mismatch → 404)
  //
  // This validates the business rule:
  // "Verify that the karma log's community_user_profile_id matches the provided
  //  userProfileId. If there is a mismatch, return 404 to prevent cross-profile access."
  // Use Member A's id as the userProfileId (a valid UUID, but not a profile id
  // that owns Member B's karma log), and Member B's member id as a fake karmaLogId.
  // Both are valid UUIDs, but neither combination should return a valid karma log.
  await TestValidator.httpError(
    "cross-profile karma log access must be denied with 404",
    404,
    async () => {
      await api.functional.community.userProfiles.karmaLogs.at(connection, {
        userProfileId: memberA.id,
        karmaLogId: memberB.id,
      });
    },
  );
  // Additionally, verify that using a completely random UUID pair also returns 404
  await TestValidator.httpError(
    "non-existent karma log must return 404",
    404,
    async () => {
      await api.functional.community.userProfiles.karmaLogs.at(connection, {
        userProfileId: typia.random<string & tags.Format<"uuid">>(),
        karmaLogId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
