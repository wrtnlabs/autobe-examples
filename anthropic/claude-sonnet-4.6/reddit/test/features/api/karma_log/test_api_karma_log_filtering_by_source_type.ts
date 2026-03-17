import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
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
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { generate_random_community_member_posts_comments_votes_create } from "../../../generate/generate_random_community_member_posts_comments_votes_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_comment_vote } from "../../../prepare/prepare_random_community_comment_vote";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_karma_log_filtering_by_source_type(
  connection: api.IConnection,
): Promise<void> {
  // =========================================================
  // 1. Register Member A (content author)
  // =========================================================
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // =========================================================
  // 2. Member A creates a community
  // =========================================================
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // =========================================================
  // 3. Member A subscribes to the community
  // =========================================================
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // =========================================================
  // 4. Member A creates a post in the community
  // =========================================================
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
  // =========================================================
  // 5. Member A creates a comment on the post
  // =========================================================
  const comment = await generate_random_community_member_posts_comments_create(
    memberAConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // =========================================================
  // 6. Register Member B (voter)
  // =========================================================
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // =========================================================
  // 7. Member B upvotes Member A's post
  //    → generates 'post_upvote_received' karma log entry for Member A
  // =========================================================
  const postVote = await api.functional.community.member.posts.votes.update(
    memberBConnection,
    {
      postId: post.id,
      body: { vote_type: "upvote" } satisfies ICommunityPostVote.IUpdate,
    },
  );
  typia.assert(postVote);
  // =========================================================
  // 8. Member B upvotes Member A's comment
  //    → generates 'comment_upvote_received' karma log entry for Member A
  // =========================================================
  const commentVote =
    await generate_random_community_member_posts_comments_votes_create(
      memberBConnection,
      {
        body: { voteType: "up" },
        params: { postId: post.id, commentId: comment.id },
      },
    );
  typia.assert(commentVote);
  // =========================================================
  // 9. Retrieve Member A's public profile
  //    Use memberA.id as userProfileId (1:1 relationship between member and profile)
  // =========================================================
  const memberAProfile = await api.functional.community.members.at(
    { host: connection.host },
    { memberId: memberA.id },
  );
  typia.assert(memberAProfile);
  const userProfileId = memberAProfile.id;
  // =========================================================
  // Main Test — PATCH /community/userProfiles/{userProfileId}/karmaLogs
  // Publicly accessible — no auth required
  // =========================================================
  const publicConnection: api.IConnection = { host: connection.host };
  // --- Step 1: No filter — should have at least 2 entries of different types ---
  const allLogs = await api.functional.community.userProfiles.karmaLogs.index(
    publicConnection,
    {
      userProfileId,
      body: {} satisfies ICommunityUserProfileKarmaLog.IRequest,
    },
  );
  typia.assert(allLogs);
  // Must have at least 2 entries (post_upvote_received + comment_upvote_received)
  TestValidator.predicate(
    "all logs has at least 2 entries",
    allLogs.data.length >= 2,
  );
  // Both source types must appear in unfiltered results
  const sourceTypesInAll = allLogs.data.map((log) => log.sourceType);
  TestValidator.predicate(
    "unfiltered results contain post_upvote_received",
    sourceTypesInAll.includes("post_upvote_received"),
  );
  TestValidator.predicate(
    "unfiltered results contain comment_upvote_received",
    sourceTypesInAll.includes("comment_upvote_received"),
  );
  // --- Step 2: Filter by post_upvote_received ---
  const postUpvoteLogs =
    await api.functional.community.userProfiles.karmaLogs.index(
      publicConnection,
      {
        userProfileId,
        body: {
          source_types: ["post_upvote_received"],
        } satisfies ICommunityUserProfileKarmaLog.IRequest,
      },
    );
  typia.assert(postUpvoteLogs);
  // Must have at least 1 entry
  TestValidator.predicate(
    "post_upvote_received filter returns at least 1 entry",
    postUpvoteLogs.data.length >= 1,
  );
  // All entries must have sourceType = 'post_upvote_received' and delta = +1
  for (const log of postUpvoteLogs.data) {
    TestValidator.equals(
      "filtered post log sourceType matches",
      log.sourceType,
      "post_upvote_received",
    );
    TestValidator.equals("post upvote delta is +1", log.delta, 1);
  }
  // No comment_upvote_received entries should appear
  TestValidator.predicate(
    "post filter excludes comment_upvote_received",
    postUpvoteLogs.data.every(
      (log) => log.sourceType !== "comment_upvote_received",
    ),
  );
  // Pagination metadata consistent with filtered data
  TestValidator.equals(
    "post filter pagination records matches data length",
    postUpvoteLogs.pagination.records,
    postUpvoteLogs.data.length,
  );
  // --- Step 3: Filter by comment_upvote_received ---
  const commentUpvoteLogs =
    await api.functional.community.userProfiles.karmaLogs.index(
      publicConnection,
      {
        userProfileId,
        body: {
          source_types: ["comment_upvote_received"],
        } satisfies ICommunityUserProfileKarmaLog.IRequest,
      },
    );
  typia.assert(commentUpvoteLogs);
  // Must have at least 1 entry
  TestValidator.predicate(
    "comment_upvote_received filter returns at least 1 entry",
    commentUpvoteLogs.data.length >= 1,
  );
  // All entries must have sourceType = 'comment_upvote_received' and delta = +1
  for (const log of commentUpvoteLogs.data) {
    TestValidator.equals(
      "filtered comment log sourceType matches",
      log.sourceType,
      "comment_upvote_received",
    );
    TestValidator.equals("comment upvote delta is +1", log.delta, 1);
  }
  // No post_upvote_received entries should appear
  TestValidator.predicate(
    "comment filter excludes post_upvote_received",
    commentUpvoteLogs.data.every(
      (log) => log.sourceType !== "post_upvote_received",
    ),
  );
  // Pagination metadata consistent with filtered data
  TestValidator.equals(
    "comment filter pagination records matches data length",
    commentUpvoteLogs.pagination.records,
    commentUpvoteLogs.data.length,
  );
  // --- Step 4: Combined filtered count does not exceed total ---
  const combinedFilteredCount =
    postUpvoteLogs.pagination.records + commentUpvoteLogs.pagination.records;
  TestValidator.predicate(
    "combined filtered count <= total count",
    combinedFilteredCount <= allLogs.pagination.records,
  );
}
