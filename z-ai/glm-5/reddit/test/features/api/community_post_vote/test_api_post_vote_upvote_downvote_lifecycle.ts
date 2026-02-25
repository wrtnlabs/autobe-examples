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

export async function test_api_post_vote_upvote_downvote_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author account and voter account
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 2. Author creates a community
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // 3. Author creates a text post in the community
  const post = await generate_random_community_member_communities_posts_create(
    authorConnection,
    {
      params: { communityName: community.name },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        text_content: RandomGenerator.content({ paragraphs: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. Verify initial post state (author auto-upvote)
  TestValidator.equals("initial vote_score", post.voteScore, 1);
  TestValidator.equals("initial upvote_count", post.upvoteCount, 1);
  TestValidator.equals("initial downvote_count", post.downvoteCount, 0);
  TestValidator.equals("author initial karma", post.author.karma, 1);
  // Store initial karma for comparison
  const initialAuthorKarma = post.author.karma;
  // 5. Voter casts upvote
  const upvote = await api.functional.community.member.posts.votes.vote(
    voterConnection,
    {
      postId: post.id,
      body: { vote: 1 } satisfies ICommunityPostVote.ICreate,
    },
  );
  typia.assert(upvote);
  // Verify upvote response
  TestValidator.equals("upvote isUpvote", upvote.isUpvote, true);
  TestValidator.equals("upvote member id", upvote.member.id, voter.id);
  TestValidator.equals("upvote post id", upvote.post.id, post.id);
  // Verify post metrics after upvote
  TestValidator.equals(
    "post vote_score after upvote",
    upvote.post.vote_score,
    2,
  );
  TestValidator.predicate(
    "post upvote_count after upvote",
    upvote.post.vote_score === 2,
  );
  // 6. Verify author karma increased by +1
  const authorAfterUpvote = await authorize_member_login(authorConnection, {
    body: {
      email: author.email,
      password: "Password123!",
      href: "",
      referrer: "",
    },
  });
  TestValidator.predicate(
    "author karma increased after upvote",
    authorAfterUpvote.karma === initialAuthorKarma + 1,
  );
  // 7. Voter attempts to upvote again - should be idempotent
  const upvoteAgain = await api.functional.community.member.posts.votes.vote(
    voterConnection,
    {
      postId: post.id,
      body: { vote: 1 } satisfies ICommunityPostVote.ICreate,
    },
  );
  typia.assert(upvoteAgain);
  // Verify idempotent behavior
  TestValidator.equals("idempotent vote_score", upvoteAgain.post.vote_score, 2);
  TestValidator.equals("idempotent isUpvote", upvoteAgain.isUpvote, true);
  // 8. Voter changes to downvote
  const downvote = await api.functional.community.member.posts.votes.vote(
    voterConnection,
    {
      postId: post.id,
      body: { vote: -1 } satisfies ICommunityPostVote.ICreate,
    },
  );
  typia.assert(downvote);
  // Verify downvote response
  TestValidator.equals("downvote isUpvote", downvote.isUpvote, false);
  TestValidator.equals("downvote post id", downvote.post.id, post.id);
  // Verify post metrics after changing to downvote
  // vote_score should be 0 (author's +1 + voter's -1)
  TestValidator.equals(
    "post vote_score after downvote",
    downvote.post.vote_score,
    0,
  );
  // 9. Verify author karma decreased by 2 (from +1 upvote to -1 downvote = net -2)
  const authorAfterDownvote = await authorize_member_login(authorConnection, {
    body: {
      email: author.email,
      password: "Password123!",
      href: "",
      referrer: "",
    },
  });
  TestValidator.equals(
    "author karma after downvote",
    authorAfterDownvote.karma,
    initialAuthorKarma - 1,
  );
  // 10. Voter removes vote entirely (vote: 0)
  const removedVote = await api.functional.community.member.posts.votes.vote(
    voterConnection,
    {
      postId: post.id,
      body: { vote: 0 } satisfies ICommunityPostVote.ICreate,
    },
  );
  typia.assert(removedVote);
  // Verify post metrics after removing vote
  // vote_score should be 1 (author's +1 only)
  TestValidator.equals(
    "post vote_score after removing vote",
    removedVote.post.vote_score,
    1,
  );
  // 11. Verify author karma returned to initial + 1 (only author's auto-upvote)
  const authorAfterRemove = await authorize_member_login(authorConnection, {
    body: {
      email: author.email,
      password: "Password123!",
      href: "",
      referrer: "",
    },
  });
  TestValidator.equals(
    "author karma after vote removed",
    authorAfterRemove.karma,
    initialAuthorKarma,
  );
}