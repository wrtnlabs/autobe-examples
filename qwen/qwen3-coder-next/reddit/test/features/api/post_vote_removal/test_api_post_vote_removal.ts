import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_votes_create_vote } from "../../../generate/generate_random_reddit_platform_member_posts_votes_create_vote";
import { generate_random_reddit_platform_posts_create } from "../../../generate/generate_random_reddit_platform_posts_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

/**
 * Test post vote removal functionality.
 * 1. Create two members (post author and voting member)
 * 2. Create a post by the first member
 * 3. The second member casts an UPVOTE
 * 4. Verify the vote record is correctly created as UPVOTE
 * 5. The second member casts NONE to remove the vote
 * 6. Verify the vote record is correctly updated to NONE
 * 7. Verify vote removal record is associated with correct post and user
 */
export async function test_api_post_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two members: post author and voting member
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await api.functional.redditPlatform.auth.member.join(
    authorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(author);
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await api.functional.redditPlatform.auth.member.join(
    voterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(voter);
  // 2. Create a post by the author member
  const post = await api.functional.redditPlatform.posts.create(
    authorConnection,
    {
      body: {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "TEXT" as const,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Voter casts an UPVOTE
  const upvote =
    await api.functional.redditPlatform.member.posts.votes.createVote(
      voterConnection,
      {
        postId: post.id,
        body: {
          vote_type: "UPVOTE" as const,
        } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  typia.assert(upvote);
  TestValidator.equals("vote type is UPVOTE", upvote.vote_type, "UPVOTE");
  TestValidator.equals("post id matches", upvote.post_id, post.id);
  TestValidator.equals("user id matches", upvote.user_id, voter.id);
  // 4. Voter casts NONE to remove the vote
  const removal =
    await api.functional.redditPlatform.member.posts.votes.createVote(
      voterConnection,
      {
        postId: post.id,
        body: {
          vote_type: "NONE" as const,
        } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  typia.assert(removal);
  TestValidator.equals("vote type is NONE", removal.vote_type, "NONE");
  TestValidator.equals("post id matches removal", removal.post_id, post.id);
  TestValidator.equals("user id matches removal", removal.user_id, voter.id);
  TestValidator.notEquals(
    "vote ID changed (update occurred)",
    upvote.id,
    removal.id,
  );
}
