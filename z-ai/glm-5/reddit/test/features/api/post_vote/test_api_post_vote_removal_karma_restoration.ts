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
import { generate_random_community_member_posts_votes_vote } from "../../../generate/generate_random_community_member_posts_votes_vote";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_post_vote } from "../../../prepare/prepare_random_community_post_vote";

export async function test_api_post_vote_removal_karma_restoration(
  connection: api.IConnection,
): Promise<void> {
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: "PasswordTest1!",
      href: "https://test.com",
    },
  });
  typia.assert(author);
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: "PasswordTest1!",
      href: "https://test.com",
    },
  });
  typia.assert(voter);
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
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
  const initialPostVoteScore = post.voteScore;
  const initialAuthorKarma = post.author.karma;
  TestValidator.equals(
    "initial vote score should be 1 (author auto-upvote)",
    initialPostVoteScore,
    1,
  );
  // Voter upvotes the post
  const upvote = await generate_random_community_member_posts_votes_vote(
    voterConnection,
    {
      params: { postId: post.id },
      body: { vote: 1 },
    },
  );
  typia.assert(upvote);
  TestValidator.equals("upvote should be true", upvote.isUpvote, true);
  TestValidator.equals(
    "upvote member matches voter",
    upvote.member.id,
    voter.id,
  );
  TestValidator.equals("upvote post matches", upvote.post.id, post.id);
  TestValidator.equals(
    "post vote score after upvote",
    upvote.post.vote_score,
    initialPostVoteScore + 1,
  );
  TestValidator.equals(
    "author karma increased after upvote",
    upvote.post.author.karma,
    initialAuthorKarma + 1,
  );
  // Voter removes the upvote
  const removeUpvote = await generate_random_community_member_posts_votes_vote(
    voterConnection,
    {
      params: { postId: post.id },
      body: { vote: 0 },
    },
  );
  typia.assert(removeUpvote);
  TestValidator.equals(
    "post vote score after upvote removal",
    removeUpvote.post.vote_score,
    initialPostVoteScore,
  );
  TestValidator.equals(
    "author karma restored after upvote removal",
    removeUpvote.post.author.karma,
    initialAuthorKarma,
  );
  // Edge case: try to remove vote when none exists
  const removeNonExistent =
    await generate_random_community_member_posts_votes_vote(voterConnection, {
      params: { postId: post.id },
      body: { vote: 0 },
    });
  typia.assert(removeNonExistent);
  TestValidator.equals(
    "post vote score unchanged after removing non-existent vote",
    removeNonExistent.post.vote_score,
    initialPostVoteScore,
  );
  // Voter downvotes the post
  const downvote = await generate_random_community_member_posts_votes_vote(
    voterConnection,
    {
      params: { postId: post.id },
      body: { vote: -1 },
    },
  );
  typia.assert(downvote);
  TestValidator.equals("downvote should be false", downvote.isUpvote, false);
  TestValidator.equals(
    "post vote score after downvote",
    downvote.post.vote_score,
    initialPostVoteScore - 1,
  );
  TestValidator.equals(
    "author karma decreased after downvote",
    downvote.post.author.karma,
    initialAuthorKarma - 1,
  );
  // Voter removes the downvote
  const removeDownvote =
    await generate_random_community_member_posts_votes_vote(voterConnection, {
      params: { postId: post.id },
      body: { vote: 0 },
    });
  typia.assert(removeDownvote);
  TestValidator.equals(
    "post vote score after downvote removal",
    removeDownvote.post.vote_score,
    initialPostVoteScore,
  );
  TestValidator.equals(
    "author karma restored after downvote removal",
    removeDownvote.post.author.karma,
    initialAuthorKarma,
  );
  // Final verification: complete vote cycle results in original state
  TestValidator.equals(
    "final vote score equals initial",
    removeDownvote.post.vote_score,
    initialPostVoteScore,
  );
  TestValidator.equals(
    "final author karma equals initial",
    removeDownvote.post.author.karma,
    initialAuthorKarma,
  );
}
