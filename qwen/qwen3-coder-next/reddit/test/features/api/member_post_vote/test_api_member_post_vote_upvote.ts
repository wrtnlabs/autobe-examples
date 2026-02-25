import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_posts_votes_create } from "../../../generate/generate_random_reddit_clone_posts_votes_create";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";
import { prepare_random_reddit_clone_content_post_vote } from "../../../prepare/prepare_random_reddit_clone_content_post_vote";

export async function test_api_member_post_vote_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (post author) and authenticate
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(author);
  // 2. Create second member (voter) and authenticate
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(voter);
  // 3. Create a post as author
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Verify initial post score is 0
  TestValidator.equals("initial post score is 0", post.vote_score, 0);
  // 5. Voter upvotes the post
  const vote = await generate_random_reddit_clone_posts_votes_create(
    voterConnection,
    {
      body: {
        voteType: "upvote" as const,
      } satisfies IRedditCloneContentPostVote.ICreate,
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(vote);
  // 6. Verify vote record
  TestValidator.equals("vote value is 1 (upvote)", vote.vote_value, 1);
  // 7. Verify voter cannot upvote their own post (self-vote restriction)
  await TestValidator.error("cannot upvote own post", async () => {
    await generate_random_reddit_clone_posts_votes_create(authorConnection, {
      body: {
        voteType: "upvote" as const,
      } satisfies IRedditCloneContentPostVote.ICreate,
      params: {
        postId: post.id,
      },
    });
  });
}