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

export async function test_api_post_vote_update_change_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two members: one to create the post, another to vote
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await api.functional.redditPlatform.auth.member.join(
    authorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
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
        password: "12345678",
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(voter);
  // 2. Create a text post (using a fixed community ID since community creation isn't available)
  const post = await api.functional.redditPlatform.posts.create(
    authorConnection,
    {
      body: {
        communityId: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        title: RandomGenerator.name(2),
        type: "TEXT" as const,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Voter casts initial UPVOTE on the post
  const upvote =
    await api.functional.redditPlatform.member.posts.votes.createVote(
      voterConnection,
      {
        postId: post.id,
        body: { vote_type: "UPVOTE" as const },
      },
    );
  typia.assert(upvote);
  // 4. Verify initial vote properties
  TestValidator.equals("initial vote_score in post", post.voteScore, 0);
  TestValidator.equals("upvote type", upvote.vote_type, "UPVOTE");
  // 5. Voter changes vote from UPVOTE to DOWNVOTE (this is the test scenario)
  const downvote =
    await api.functional.redditPlatform.member.posts.votes.createVote(
      voterConnection,
      {
        postId: post.id,
        body: { vote_type: "DOWNVOTE" as const },
      },
    );
  typia.assert(downvote);
  // 6. Verify vote change results
  TestValidator.equals(
    "final vote_type is DOWNVOTE",
    downvote.vote_type,
    "DOWNVOTE",
  );
  TestValidator.equals("post unchanged", post.id, downvote.post_id);
  TestValidator.predicate(
    "vote has timestamps",
    typeof downvote.created_at === "string" &&
      typeof downvote.updated_at === "string",
  );
}
