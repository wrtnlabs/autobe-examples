import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import type { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_votes_create } from "../../../generate/generate_random_reddit_community_member_votes_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_vote } from "../../../prepare/prepare_random_reddit_community_vote";

export async function test_api_vote_remove_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a post
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(post);
  // 3. Capture initial vote_score before upvote
  const initialVoteScore = post.vote_score;
  typia.assert(initialVoteScore);
  // 4. Cast an upvote on the post
  const vote = await generate_random_reddit_community_member_votes_create(
    memberConnection,
    {
      body: {
        vote_type: "upvote",
        target_post_id: post.id,
      },
    },
  );
  typia.assert(vote);
  typia.assert(vote.id);
  // 5. Capture voteScore after upvote (should be initial + 1)
  const voteAfterUpvote = vote.targetPost?.vote_score;
  typia.assert(voteAfterUpvote);
  // 6. Remove the upvote by updating vote_type to null
  const removedVote = await api.functional.redditCommunity.member.votes.update(
    memberConnection,
    {
      voteId: vote.id,
      body: {
        vote_type: null,
      },
    },
  );
  typia.assert(removedVote);
  // 7. Validate vote record has vote_type=null and deleted_at timestamp
  if (removedVote.vote_type !== null) {
    throw new Error("Expected vote_type to be null after removal");
  }
  if (removedVote.deleted_at === null) {
    throw new Error("Expected deleted_at to be set after vote removal");
  }
  // 8. Validate post's vote_score returns to original (0)
  if (removedVote.targetPost === null || removedVote.targetPost === undefined) {
    throw new Error("Expected targetPost to be present");
  }
  const finalVoteScore = removedVote.targetPost.vote_score;
  TestValidator.equals("vote_score returns to 0", finalVoteScore, 0);
  // 9. Validate post's vote_score equals initial (excludes removed vote)
  TestValidator.equals(
    "vote_score equals initial",
    finalVoteScore,
    initialVoteScore,
  );
  // 10. Verify member karma was tracked (via karma adjustment logic)
  typia.assert(removedVote.member);
  if (removedVote.member.karma === undefined) {
    throw new Error("Expected member karma to be present");
  }
}