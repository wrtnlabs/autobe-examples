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
 * Test retrieving an active upvote record from a post.
 *
 * Validates the complete workflow of creating an upvote on a post and retrieving the vote record. Ensures that the vote record contains all required fields including the vote type, timestamps, and references to both the post and member. Verifies that active votes have null deleted_at and that the vote type matches the upvote that was cast.
 *
 * Special attention is given to verifying that the post summary and member summary are correctly included in the vote record response, and that the vote_score on the post reflects the upvote contribution.
 *
 * 1. Register and authenticate as a member using authorize_member_join.
 * 2. Create a text post in a community (using generated community ID).
 * 3. Cast an upvote on the post using generate_random_reddit_clone_member_posts_votes_create.
 * 4. Retrieve the vote record using api.functional.redditClone.posts.votes.at.
 * 5. Validate the vote record structure and content.
 */
export async function test_api_post_vote_retrieve_active_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post in a community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: typia.random<string & tags.Format<"uuid">>(),
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Cast an upvote on the post
  const vote = await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        vote_type: "upvote",
      } satisfies IRedditClonePostVote.ICreate,
    },
  );
  typia.assert(vote);
  // 4. Retrieve the vote record
  const retrievedVote = await api.functional.redditClone.posts.votes.at(
    memberConnection,
    {
      postId: post.id,
      voteId: vote.id,
    },
  );
  typia.assert(retrievedVote);
  // 5. Validate the vote record
  TestValidator.equals("vote id matches", retrievedVote.id, vote.id);
  TestValidator.equals(
    "vote type is upvote",
    retrievedVote.vote_type,
    "upvote",
  );
  TestValidator.predicate(
    "deleted_at is null for active vote",
    retrievedVote.deleted_at === null,
  );
  TestValidator.equals("post id matches", retrievedVote.post.id, post.id);
  TestValidator.equals("member id matches", retrievedVote.member.id, member.id);
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      retrievedVote.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      retrievedVote.updated_at,
    ),
  );
  TestValidator.predicate(
    "post vote_score reflects upvote",
    retrievedVote.post.vote_score >= 1,
  );
  TestValidator.equals(
    "post title matches",
    retrievedVote.post.title,
    post.title,
  );
  TestValidator.equals(
    "member username matches",
    retrievedVote.member.username,
    member.username,
  );
}
