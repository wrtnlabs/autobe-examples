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

export async function test_api_post_vote_remove(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test vote removal workflow: A member removes their existing vote entirely.
   *
   * Steps:
   * 1. First member creates a community and a TEXT post
   * 2. Second member upvotes the post (vote=1) - verify initial score is 2
   * 3. Second member removes their vote (vote=0)
   * 4. Verify response shows voteScore decremented by 1 (from 2 back to 1)
   * 5. Verify upvoteCount decreased by 1 and downvoteCount remains 0
   */
  // Step 1: First member joins and creates community and post
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `Password${RandomGenerator.alphaNumeric(6)}1!`,
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(author);
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(community);
  const post = await generate_random_community_member_communities_posts_create(
    authorConnection,
    {
      params: { communityName: community.name },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // Verify post has author's auto-upvote (score = 1)
  TestValidator.equals("post initial vote score", post.voteScore, 1);
  TestValidator.equals("post initial upvote count", post.upvoteCount, 1);
  TestValidator.equals("post initial downvote count", post.downvoteCount, 0);
  // Step 2: Second member joins and upvotes the post
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `Password${RandomGenerator.alphaNumeric(6)}1!`,
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(voter);
  const upvoteResult = await generate_random_community_member_posts_vote(
    voterConnection,
    {
      params: { postId: post.id },
      body: { vote: 1 },
    },
  );
  typia.assert(upvoteResult);
  // Verify score after upvote: should be 2 (author + voter)
  TestValidator.equals("vote score after upvote", upvoteResult.voteScore, 2);
  TestValidator.equals(
    "upvote count after upvote",
    upvoteResult.upvoteCount,
    2,
  );
  TestValidator.equals(
    "downvote count after upvote",
    upvoteResult.downvoteCount,
    0,
  );
  // Step 3: Voter removes their vote (vote = 0)
  const removeVoteResult = await generate_random_community_member_posts_vote(
    voterConnection,
    {
      params: { postId: post.id },
      body: { vote: 0 },
    },
  );
  typia.assert(removeVoteResult);
  // Step 4: Verify vote was removed correctly
  // Score should be back to 1 (author's auto-upvote only)
  TestValidator.equals(
    "vote score after removal",
    removeVoteResult.voteScore,
    1,
  );
  TestValidator.equals(
    "upvote count after removal",
    removeVoteResult.upvoteCount,
    1,
  );
  TestValidator.equals(
    "downvote count after removal",
    removeVoteResult.downvoteCount,
    0,
  );
  // Verify that the voter can upvote again (proves vote was deleted)
  const reUpvoteResult = await generate_random_community_member_posts_vote(
    voterConnection,
    {
      params: { postId: post.id },
      body: { vote: 1 },
    },
  );
  typia.assert(reUpvoteResult);
  TestValidator.equals(
    "vote score after re-upvote",
    reUpvoteResult.voteScore,
    2,
  );
  TestValidator.equals(
    "upvote count after re-upvote",
    reUpvoteResult.upvoteCount,
    2,
  );
  // Step 5: Verify voter can change to downvote after removing
  const downvoteResult = await generate_random_community_member_posts_vote(
    voterConnection,
    {
      params: { postId: post.id },
      body: { vote: -1 },
    },
  );
  typia.assert(downvoteResult);
  // Score should be 0 (author's +1, voter changed from +1 to -1 = net 0)
  TestValidator.equals(
    "vote score after downvote change",
    downvoteResult.voteScore,
    0,
  );
  TestValidator.equals(
    "upvote count after downvote change",
    downvoteResult.upvoteCount,
    1,
  );
  TestValidator.equals(
    "downvote count after downvote change",
    downvoteResult.downvoteCount,
    1,
  );
  // Step 6: Remove the downvote (vote = 0)
  const removeDownvoteResult =
    await generate_random_community_member_posts_vote(voterConnection, {
      params: { postId: post.id },
      body: { vote: 0 },
    });
  typia.assert(removeDownvoteResult);
  // Score should be back to 1 (author's auto-upvote only)
  TestValidator.equals(
    "vote score after downvote removal",
    removeDownvoteResult.voteScore,
    1,
  );
  TestValidator.equals(
    "upvote count after downvote removal",
    removeDownvoteResult.upvoteCount,
    1,
  );
  TestValidator.equals(
    "downvote count after downvote removal",
    removeDownvoteResult.downvoteCount,
    0,
  );
}
