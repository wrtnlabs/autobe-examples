import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussPostVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostVoteStatus";
import type { IEEconDiscussPostVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostVoteType";
import type { IEEconDiscussVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteType";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostVote";

export async function test_api_vote_history_list_default_ordering(
  connection: api.IConnection,
) {
  /**
   * Validate the default listing of a member's vote history.
   *
   * Steps:
   *
   * 1. Register authorUser and create 3 posts.
   * 2. Register voterUser and cast votes: up(Post1), down(Post2), withdraw(Post2),
   *    up(Post3).
   * 3. Fetch GET /econDiscuss/member/me/votes and validate ordering (createdAt
   *    desc), scoping to caller, correctness of status/voteType, and pagination
   *    coherence.
   */
  // 1) Register authorUser
  const authorJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P" + RandomGenerator.alphaNumeric(9),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorJoin);

  // 2) Author creates 3 posts
  const posts: IEconDiscussPost[] = await ArrayUtil.asyncRepeat(
    3,
    async (_i) => {
      const createBody = {
        title: RandomGenerator.paragraph({ sentences: 6 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconDiscussPost.ICreate;
      const post = await api.functional.econDiscuss.member.posts.create(
        connection,
        {
          body: createBody,
        },
      );
      typia.assert(post);
      return post;
    },
  );

  // 3) Register voterUser (this switches Authorization to the voter)
  const voterJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P" + RandomGenerator.alphaNumeric(9),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(voterJoin);

  // Voter casts votes: up(Post1), down(Post2), withdraw(Post2), up(Post3)
  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: posts[0].id,
    body: { vote_type: "up" } satisfies IEconDiscussPostVote.ICreate,
  });
  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: posts[1].id,
    body: { vote_type: "down" } satisfies IEconDiscussPostVote.ICreate,
  });
  await api.functional.econDiscuss.member.posts.votes.self.erase(connection, {
    postId: posts[1].id,
  });
  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: posts[2].id,
    body: { vote_type: "up" } satisfies IEconDiscussPostVote.ICreate,
  });

  // 4) Retrieve vote history
  const page =
    await api.functional.econDiscuss.member.me.votes.index(connection);
  typia.assert(page);

  // Pagination coherence
  TestValidator.predicate(
    "vote history includes at least 3 records",
    page.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pagination.limit covers returned data length",
    page.pagination.limit >= page.data.length,
  );
  TestValidator.predicate(
    "pagination.current is non-negative",
    page.pagination.current >= 0,
  );

  // Ordering: createdAt desc (ISO-8601 lexicographic check)
  TestValidator.predicate(
    "vote history ordered by createdAt desc",
    (() => {
      for (let i = 1; i < page.data.length; ++i) {
        if (page.data[i - 1].createdAt < page.data[i].createdAt) return false;
      }
      return true;
    })(),
  );

  // Latest record should correspond to the most recent vote (Post3)
  if (page.data.length > 0) {
    TestValidator.equals(
      "latest vote corresponds to Post3",
      page.data[0].postId,
      posts[2].id,
    );
  }

  // Validate presence and states for each targeted post
  const v1 = typia.assert<IEconDiscussPostVote.ISummary>(
    page.data.find((v) => v.postId === posts[0].id)!,
  );
  TestValidator.equals("post1 voteType is up", v1.voteType, "up");
  TestValidator.equals("post1 status is active", v1.status, "active");

  const v2 = typia.assert<IEconDiscussPostVote.ISummary>(
    page.data.find((v) => v.postId === posts[1].id)!,
  );
  TestValidator.equals(
    "post2 status is withdrawn after erase",
    v2.status,
    "withdrawn",
  );
  TestValidator.equals("post2 voteType persisted as down", v2.voteType, "down");

  const v3 = typia.assert<IEconDiscussPostVote.ISummary>(
    page.data.find((v) => v.postId === posts[2].id)!,
  );
  TestValidator.equals("post3 voteType is up", v3.voteType, "up");
  TestValidator.equals("post3 status is active", v3.status, "active");
}
