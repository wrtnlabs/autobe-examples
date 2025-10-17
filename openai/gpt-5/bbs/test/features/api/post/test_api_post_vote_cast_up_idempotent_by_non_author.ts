import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteType";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostVote";

/**
 * Non-author member casts an upvote and duplicate upvote is idempotent;
 * unauthenticated is rejected.
 *
 * Purpose
 *
 * - Ensure a member who is not the author can upvote a post successfully.
 * - Ensure calling the same upvote twice is safe (idempotent, no duplicate row,
 *   no error).
 * - Ensure unauthenticated attempts to vote are rejected.
 *
 * Steps
 *
 * 1. Register author (member) and obtain Authorization (SDK auto-applies token).
 * 2. Author creates a post; validate authorship and response types.
 * 3. Register a different member (voter); SDK switches Authorization.
 * 4. Voter casts an initial upvote on the author's post.
 * 5. Voter repeats the same upvote to validate idempotency (no error thrown).
 * 6. Negative: Use an unauthenticated connection to attempt vote; expect error.
 */
export async function test_api_post_vote_cast_up_idempotent_by_non_author(
  connection: api.IConnection,
) {
  // 1) Register author (member)
  const author = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password-1234",
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(author);

  // 2) Author creates a post
  const createPostBody = {
    title: RandomGenerator.paragraph({ sentences: 6 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    scheduled_publish_at: null,
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: createPostBody,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post author should equal the authenticated author",
    post.author_user_id,
    author.id,
  );

  // 3) Register a different member (voter)
  const voter = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password-1234",
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(voter);
  TestValidator.notEquals(
    "voter must be different from author",
    voter.id,
    author.id,
  );

  // 4) Voter casts an initial upvote on the author's post
  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: post.id,
    body: {
      vote_type: "up",
    } satisfies IEconDiscussPostVote.ICreate,
  });

  // 5) Repeat the same upvote to validate idempotency (should be safe)
  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: post.id,
    body: {
      vote_type: "up",
    } satisfies IEconDiscussPostVote.ICreate,
  });

  // 6) Negative: Unauthenticated attempt should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated vote attempt should fail",
    async () => {
      await api.functional.econDiscuss.member.posts.votes.create(unauthConn, {
        postId: post.id,
        body: {
          vote_type: "up",
        } satisfies IEconDiscussPostVote.ICreate,
      });
    },
  );
}
