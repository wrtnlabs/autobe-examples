import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
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
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_vote } from "../../../generate/generate_random_community_member_posts_vote";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_post_vote } from "../../../prepare/prepare_random_community_post_vote";

/**
 * Test vote modification workflow: A member changes their vote from upvote to downvote.
 *
 * Steps:
 * 1. First member creates a community and a TEXT post
 * 2. Second member upvotes the post (vote=1) - verify initial score is 2 (author's auto-upvote + second member's upvote)
 * 3. Second member changes vote to downvote (vote=-1)
 * 4. Verify response shows voteScore decremented by 2 (from +2 to 0, reflecting the change from upvote to downvote)
 * 5. Verify upvoteCount decreased by 1 and downvoteCount increased by 1
 */
export async function test_api_post_vote_change_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member joins and creates community and post
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  const post = await generate_random_community_member_communities_posts_create(
    authorConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // Verify initial post has author's auto-upvote (score = 1)
  TestValidator.equals("initial vote score", post.voteScore, 1);
  TestValidator.equals("initial upvote count", post.upvoteCount, 1);
  TestValidator.equals("initial downvote count", post.downvoteCount, 0);
  // 2. Second member joins and upvotes the post
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {});
  const upvoteResult = await generate_random_community_member_posts_vote(
    voterConnection,
    {
      params: { postId: post.id },
      body: { vote: 1 },
    },
  );
  typia.assert(upvoteResult);
  // Verify after upvote: score = 2 (author's auto-upvote + voter's upvote)
  TestValidator.equals("after upvote score", upvoteResult.voteScore, 2);
  TestValidator.equals(
    "after upvote upvote count",
    upvoteResult.upvoteCount,
    2,
  );
  TestValidator.equals(
    "after upvote downvote count",
    upvoteResult.downvoteCount,
    0,
  );
  // 3. Change vote from upvote to downvote
  const changeVoteResult = await generate_random_community_member_posts_vote(
    voterConnection,
    {
      params: { postId: post.id },
      body: { vote: -1 },
    },
  );
  typia.assert(changeVoteResult);
  // 4. Verify vote change effects
  // Score goes from 2 to 0 (removed +1 upvote, added -1 downvote = -2 change)
  TestValidator.equals("after downvote score", changeVoteResult.voteScore, 0);
  TestValidator.equals(
    "after downvote upvote count",
    changeVoteResult.upvoteCount,
    1,
  );
  TestValidator.equals(
    "after downvote downvote count",
    changeVoteResult.downvoteCount,
    1,
  );
}
