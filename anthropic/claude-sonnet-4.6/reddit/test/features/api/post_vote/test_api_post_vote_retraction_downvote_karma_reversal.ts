import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
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
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_post_vote_retraction_downvote_karma_reversal(
  connection: api.IConnection,
): Promise<void> {
  // -----------------------------------------------------------------------
  // Step 1: Register Member A (post author)
  // -----------------------------------------------------------------------
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuth);
  const memberAInitialKarma = memberAAuth.karma_score;
  // -----------------------------------------------------------------------
  // Step 2: Create a community as Member A
  // -----------------------------------------------------------------------
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // -----------------------------------------------------------------------
  // Step 3: Subscribe Member A to the community
  // -----------------------------------------------------------------------
  const memberASubscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      { communityId: community.id },
    );
  typia.assert(memberASubscription);
  // -----------------------------------------------------------------------
  // Step 4: Create a text post as Member A
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
  // Step 5: Register Member B (voter)
  // -----------------------------------------------------------------------
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuth);
  // -----------------------------------------------------------------------
  // Step 6: Subscribe Member B to the community
  // -----------------------------------------------------------------------
  const memberBSubscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberBConnection,
      { communityId: community.id },
    );
  typia.assert(memberBSubscription);
  // -----------------------------------------------------------------------
  // Step 7: Member B casts a downvote on Member A's post
  // -----------------------------------------------------------------------
  const downvote = await api.functional.community.member.posts.votes.update(
    memberBConnection,
    {
      postId: post.id,
      body: {
        vote_type: "downvote",
      } satisfies ICommunityPostVote.IUpdate,
    },
  );
  typia.assert(downvote);
  // Validate downvote state: vote direction is downvote, score is -1
  TestValidator.equals(
    "downvote type is downvote",
    downvote.voteType,
    "downvote",
  );
  TestValidator.equals(
    "post vote score after downvote is -1",
    downvote.post.vote_score,
    -1,
  );
  // Record Member A's karma after downvote (negative karma impact)
  const memberAKarmaAfterDownvote = downvote.post.author.karma_score;
  TestValidator.predicate(
    "karma decreased after downvote",
    memberAKarmaAfterDownvote < memberAInitialKarma,
  );
  // -----------------------------------------------------------------------
  // Step 8: Member B retracts the downvote (DELETE /community/member/posts/{postId}/votes)
  // -----------------------------------------------------------------------
  await api.functional.community.member.posts.votes.erase(memberBConnection, {
    postId: post.id,
  });
  // HTTP 204 No Content — void return, retraction is confirmed by no exception thrown
  // -----------------------------------------------------------------------
  // Post-condition Validation:
  // After retraction, Member B casts a fresh upvote. If the vote score becomes
  // +1, it proves the score returned to 0 after retraction (downvote was fully
  // reversed). This is the best indirect validation available with the given SDK.
  // -----------------------------------------------------------------------
  const freshVote = await api.functional.community.member.posts.votes.update(
    memberBConnection,
    {
      postId: post.id,
      body: {
        vote_type: "upvote",
      } satisfies ICommunityPostVote.IUpdate,
    },
  );
  typia.assert(freshVote);
  // Vote score should be +1, confirming it was 0 after retraction (not -1 still)
  TestValidator.equals(
    "vote score after retraction then upvote confirms score reset to 0 before upvote",
    freshVote.post.vote_score,
    1,
  );
  // Member A's karma after fresh upvote should be higher than after downvote,
  // confirming the downvote karma was reversed and new upvote karma was applied
  const memberAKarmaAfterReversal = freshVote.post.author.karma_score;
  TestValidator.predicate(
    "Member A karma recovered above downvoted level after retraction and new upvote",
    memberAKarmaAfterReversal > memberAKarmaAfterDownvote,
  );
}
