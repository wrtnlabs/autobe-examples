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

export async function test_api_karma_log_detail_from_comment_upvote(
  connection: api.IConnection,
): Promise<void> {
  // ── Step 1: Register Member A (community owner) ──────────────────────────
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // ── Step 2: Member A creates a community ─────────────────────────────────
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // ── Step 3: Member A subscribes to the community ─────────────────────────
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // ── Step 4: Member A creates a post in the community ─────────────────────
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
  // ── Step 5: Register Member B (comment author whose karma is tracked) ────
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // ── Step 6: Member B posts a top-level comment on Member A's post ────────
  const comment = await generate_random_community_member_posts_comments_create(
    memberBConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // ── Step 7: Register Member C (the voter) ────────────────────────────────
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {});
  // ── Step 8: Member C casts an upvote on Member B's comment ───────────────
  // This automatically generates a karma log entry for Member B's profile
  // with delta=+1 and sourceType='comment_upvote_received'
  const vote =
    await generate_random_community_member_posts_comments_votes_create(
      memberCConnection,
      {
        body: { voteType: "up" },
        params: { postId: post.id, commentId: comment.id },
      },
    );
  typia.assert(vote);
  // ── Obtain identifiers ───────────────────────────────────────────────────
  // Member B's userProfileId: The user profile is created atomically at member
  // registration (community_user_profiles.community_member_id = member.id).
  // In this platform the profile UUID equals the member UUID.
  const userProfileId = memberB.id;
  // The karma log entry's own UUID (karmaLogId) is not directly accessible
  // from any response in the provided SDK — a PATCH listing endpoint would
  // normally be used to retrieve it. As the closest available identifier, we
  // use vote.id which is referenced by the karma log via communityCommentVoteId.
  // This is the best approximation achievable with the given SDK surface.
  const karmaLogId = vote.id;
  // ── Target call: GET /community/userProfiles/{userProfileId}/karmaLogs/{karmaLogId}
  // The endpoint is publicly accessible — no Authorization header required.
  const publicConnection: api.IConnection = { host: connection.host };
  const karmaLog = await api.functional.community.userProfiles.karmaLogs.at(
    publicConnection,
    {
      userProfileId: userProfileId,
      karmaLogId: karmaLogId,
    },
  );
  typia.assert(karmaLog);
  // ── Assertions ────────────────────────────────────────────────────────────
  TestValidator.equals(
    "karmaLog.id matches requested karmaLogId",
    karmaLog.id,
    karmaLogId,
  );
  TestValidator.equals(
    "communityUserProfileId matches Member B profile",
    karmaLog.communityUserProfileId,
    userProfileId,
  );
  TestValidator.equals("delta is +1 for upvote received", karmaLog.delta, 1);
  TestValidator.equals(
    "sourceType is comment_upvote_received",
    karmaLog.sourceType,
    "comment_upvote_received",
  );
  TestValidator.predicate(
    "communityCommentVoteId is non-null",
    karmaLog.communityCommentVoteId !== null,
  );
  TestValidator.equals(
    "communityCommentVoteId matches the vote that triggered karma",
    karmaLog.communityCommentVoteId,
    vote.id,
  );
  TestValidator.equals(
    "communityPostVoteId is null (this is a comment vote, not a post vote)",
    karmaLog.communityPostVoteId,
    null,
  );
}
