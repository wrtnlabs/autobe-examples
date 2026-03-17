import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import type { ICommunityUserProfileKarmaLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfileKarmaLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityUserProfileKarmaLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityUserProfileKarmaLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_karma_log_listing_after_post_votes(
  connection: api.IConnection,
): Promise<void> {
  // -----------------------------------------------------------------------
  // 1. Register member A (content author) — use authorize_member_join utility
  // -----------------------------------------------------------------------
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // -----------------------------------------------------------------------
  // 2. Member A creates a community — use generate_random_community utility
  // -----------------------------------------------------------------------
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // -----------------------------------------------------------------------
  // 3. Member A subscribes to the community
  // -----------------------------------------------------------------------
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // -----------------------------------------------------------------------
  // 4. Member A creates a post in the community
  // -----------------------------------------------------------------------
  const post = await api.functional.community.member.communities.posts.create(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // -----------------------------------------------------------------------
  // 5. Register member B (voter) — use authorize_member_join utility
  // -----------------------------------------------------------------------
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // -----------------------------------------------------------------------
  // 6. Member B casts an upvote on member A's post
  // -----------------------------------------------------------------------
  const vote = await api.functional.community.member.posts.votes.update(
    memberBConnection,
    {
      postId: post.id,
      body: { vote_type: "upvote" } satisfies ICommunityPostVote.IUpdate,
    },
  );
  typia.assert(vote);
  // -----------------------------------------------------------------------
  // 7. Retrieve member A's public profile (no auth — public endpoint)
  // -----------------------------------------------------------------------
  const memberAProfile = await api.functional.community.members.at(
    { host: connection.host },
    { memberId: memberA.id },
  );
  typia.assert(memberAProfile);
  // -----------------------------------------------------------------------
  // 8. Query karma logs for member A's user profile (no auth required).
  //    Use memberA.id as userProfileId (community_user_profiles.id is 1:1
  //    with community_members.id but may differ; this is the closest
  //    available identifier from the public API surface).
  // -----------------------------------------------------------------------
  const noAuthConnection: api.IConnection = { host: connection.host };
  const karmaLogs = await api.functional.community.userProfiles.karmaLogs.index(
    noAuthConnection,
    {
      userProfileId: memberA.id,
      body: {} satisfies ICommunityUserProfileKarmaLog.IRequest,
    },
  );
  typia.assert(karmaLogs);
  // -----------------------------------------------------------------------
  // 9. Validate pagination metadata reflects non-negative counts
  // -----------------------------------------------------------------------
  TestValidator.predicate(
    "pagination.current is at least 1",
    karmaLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit is positive",
    karmaLogs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    karmaLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    karmaLogs.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination.records >= data.length",
    karmaLogs.pagination.records >= karmaLogs.data.length,
  );
  // -----------------------------------------------------------------------
  // 10. Validate that at least one karma log entry exists (upvote received)
  // -----------------------------------------------------------------------
  TestValidator.predicate(
    "karma logs has at least one entry",
    karmaLogs.data.length >= 1,
  );
  // -----------------------------------------------------------------------
  // 11. Validate that at least one entry has sourceType = 'post_upvote_received'
  //     and delta = +1
  // -----------------------------------------------------------------------
  const upvoteEntry = karmaLogs.data.find(
    (entry) => entry.sourceType === "post_upvote_received",
  );
  TestValidator.predicate(
    "at least one entry with sourceType=post_upvote_received",
    upvoteEntry !== undefined,
  );
  if (upvoteEntry !== undefined) {
    TestValidator.equals("upvote karma delta is +1", upvoteEntry.delta, 1);
    TestValidator.predicate(
      "upvote entry: communityPostVoteId is non-null",
      upvoteEntry.communityPostVoteId !== null,
    );
    TestValidator.predicate(
      "upvote entry: communityCommentVoteId is null",
      upvoteEntry.communityCommentVoteId === null,
    );
  }
  // -----------------------------------------------------------------------
  // 12. Validate each entry satisfies the vote-source exclusivity rule:
  //     exactly one of communityPostVoteId or communityCommentVoteId is non-null
  // -----------------------------------------------------------------------
  for (const entry of karmaLogs.data) {
    const hasPostVote = entry.communityPostVoteId !== null;
    const hasCommentVote = entry.communityCommentVoteId !== null;
    TestValidator.predicate(
      "exactly one of postVoteId or commentVoteId is non-null per entry",
      (hasPostVote && !hasCommentVote) || (!hasPostVote && hasCommentVote),
    );
  }
  // -----------------------------------------------------------------------
  // 13. Verify default ordering is descending by createdAt (newest first)
  // -----------------------------------------------------------------------
  if (karmaLogs.data.length >= 2) {
    const timestamps = karmaLogs.data.map((e) =>
      new Date(e.createdAt).getTime(),
    );
    const isDescending = timestamps.every(
      (ts, i) => i === 0 || ts <= timestamps[i - 1],
    );
    TestValidator.predicate(
      "karma logs are ordered descending by createdAt (newest first)",
      isDescending,
    );
  }
}
