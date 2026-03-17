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

export async function test_api_vote_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuthorized);
  typia.assert(memberAuthorized.token);
  // 2. Create text post with required community_id
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: RandomGenerator.name(3),
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  typia.assert(post.id);
  // 3. Cast initial upvote on the post
  const upvote = await generate_random_reddit_community_member_votes_create(
    memberConnection,
    {
      body: {
        vote_type: "upvote",
        target_post_id: post.id,
      } satisfies IRedditCommunityVote.ICreate,
    },
  );
  typia.assert(upvote);
  typia.assert(upvote.id);
  typia.assert(upvote.member);
  typia.assert(upvote.member.id);
  typia.assert(upvote.member.karma);
  const karmaAfterUpvote = upvote.member.karma;
  // 4. Capture initial post vote score (should be 1 after upvote)
  const postVoteScoreAfterUpvote = post.vote_score;
  TestValidator.predicate(
    "post vote score is 1 after upvote",
    postVoteScoreAfterUpvote === 1,
  );
  // 5. Change vote from upvote to downvote
  const updatedVote = await api.functional.redditCommunity.member.votes.update(
    memberConnection,
    {
      voteId: upvote.id,
      body: {
        vote_type: "downvote",
      } satisfies IRedditCommunityVote.IUpdate,
    },
  );
  typia.assert(updatedVote);
  typia.assert(updatedVote.member);
  typia.assert(updatedVote.member.id);
  typia.assert(updatedVote.member.karma);
  const karmaAfterDownvote = updatedVote.member.karma;
  // 6. Validate vote change
  TestValidator.equals(
    "vote type changed to downvote",
    updatedVote.vote_type,
    "downvote",
  );
  TestValidator.notEquals(
    "vote timestamps updated",
    upvote.created_at,
    updatedVote.updated_at,
  );
  // 7. Verify vote belongs to same member
  TestValidator.equals(
    "vote belongs to same member",
    updatedVote.member.id,
    upvote.member.id,
  );
  // 8. Verify vote target is correct post
  typia.assert(updatedVote.targetPost);
  typia.assert(updatedVote.targetPost!.id);
  TestValidator.equals(
    "vote target is correct post",
    updatedVote.targetPost!.id,
    post.id,
  );
  // 9. Verify vote score changed by -2 (from +1 to -1)
  const expectedVoteScore = postVoteScoreAfterUpvote - 2;
  TestValidator.equals(
    "post vote score adjusted by -2",
    updatedVote.targetPost!.vote_score,
    expectedVoteScore,
  );
  // 10. Verify member karma adjusted by -2 (from initial+1 to initial-1)
  const karmaScoreAfterUpvote = karmaAfterUpvote ?? 0;
  const karmaScoreAfterDownvote = karmaAfterDownvote ?? 0;
  const expectedKarma = karmaScoreAfterUpvote - 2;
  TestValidator.equals(
    "member karma decreased by 2",
    karmaScoreAfterDownvote,
    expectedKarma,
  );
  // 11. Verify vote type in response is downvote
  TestValidator.equals(
    "updated vote has correct direction",
    updatedVote.vote_type,
    "downvote",
  );
}
