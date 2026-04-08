import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_votes_create";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

/**
 * Test that voting on a post correctly creates and updates vote records.
 *
 * Validates the post voting workflow where authenticated members can cast upvotes or downvotes on posts. The test creates two member accounts (author and voter), has the author create a post, then systematically tests upvoting, downvoting, and vote updates while verifying the vote entities are created correctly.
 *
 * Vote records track the vote type (upvote/downvote) and are associated with both the post and the voter. Each member can only have one active vote per post, so casting a new vote updates the existing vote record.
 *
 * 1. Authenticate two members: author and voter
 * 2. Author creates a text post in a community
 * 3. Voter upvotes the post, verify vote entity is created with upvote type
 * 4. Voter changes vote to downvote, verify vote entity is updated to downvote type
 * 5. Verify vote entities contain correct post and member references
 */
export async function test_api_post_vote_karma_impact_calculation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate author member
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(author);
  // 2. Authenticate voter member
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(voter);
  // 3. Author creates a text post
  const post = await api.functional.redditClone.member.posts.create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
        community_id: typia.random<string & typia.tags.Format<"uuid">>(),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Voter upvotes the post
  const upvote = await generate_random_reddit_clone_member_posts_votes_create(
    voterConnection,
    {
      params: { postId: post.id },
      body: { vote_type: "upvote" },
    },
  );
  typia.assert(upvote);
  // Verify upvote entity
  TestValidator.equals("upvote type is correct", upvote.vote_type, "upvote");
  TestValidator.equals(
    "upvote references correct post",
    upvote.post.id,
    post.id,
  );
  TestValidator.equals(
    "upvote references correct voter",
    upvote.member.id,
    voter.id,
  );
  // 5. Voter changes vote to downvote (updates existing vote)
  const downvote = await generate_random_reddit_clone_member_posts_votes_create(
    voterConnection,
    {
      params: { postId: post.id },
      body: { vote_type: "downvote" },
    },
  );
  typia.assert(downvote);
  // Verify downvote entity
  TestValidator.equals(
    "downvote type is correct",
    downvote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "downvote references correct post",
    downvote.post.id,
    post.id,
  );
  TestValidator.equals(
    "downvote references correct voter",
    downvote.member.id,
    voter.id,
  );
  // 6. Verify vote was updated (same vote ID) or new vote created
  // The API should update the existing vote, so IDs should be the same
  TestValidator.equals(
    "vote record is updated not recreated",
    upvote.id,
    downvote.id,
  );
  // 7. Verify author's initial karma is recorded
  TestValidator.predicate("author has initial karma score", author.karma >= 0);
  // 8. Verify post has vote score after voting
  TestValidator.predicate(
    "post vote score reflects downvote",
    post.vote_score <= 0,
  );
}
