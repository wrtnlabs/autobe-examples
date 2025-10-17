import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteType";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPost";

/**
 * Validate that trending sort prioritizes a recently upvoted post.
 *
 * Steps:
 *
 * 1. Join a member to obtain an authenticated session (token handled by SDK).
 * 2. Create two posts (A and B) authored by the member.
 * 3. Optionally set scheduled_publish_at to now for both posts to ensure
 *    eligibility.
 * 4. Cast a recent upvote on Post A.
 * 5. Search with sort="trending" and validate that Post A ranks ahead of Post B.
 *
 * Notes:
 *
 * - Do not manipulate connection.headers directly – the SDK manages tokens.
 * - Use only DTO fields that exist (no published_at in IUpdate), and typia.assert
 *   non-void responses.
 * - Do not assert an exact scoring algorithm beyond recent vote precedence.
 */
export async function test_api_post_search_trending_recency_voted_first(
  connection: api.IConnection,
) {
  // 1) Join member (authentication)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Create two posts (A, B)
  const createBodyA = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussPost.ICreate;
  const postA = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: createBodyA,
    },
  );
  typia.assert(postA);

  const createBodyB = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussPost.ICreate;
  const postB = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: createBodyB,
    },
  );
  typia.assert(postB);

  // 3) Ensure eligibility via scheduling (allowed by IUpdate)
  const nowIso: string = new Date().toISOString();
  const postAUpdated = await api.functional.econDiscuss.member.posts.update(
    connection,
    {
      postId: postA.id,
      body: {
        scheduled_publish_at: nowIso,
      } satisfies IEconDiscussPost.IUpdate,
    },
  );
  typia.assert(postAUpdated);

  const postBUpdated = await api.functional.econDiscuss.member.posts.update(
    connection,
    {
      postId: postB.id,
      body: {
        scheduled_publish_at: nowIso,
      } satisfies IEconDiscussPost.IUpdate,
    },
  );
  typia.assert(postBUpdated);

  // 4) Cast a recent upvote on Post A
  const voteBody = {
    vote_type: "up",
  } satisfies IEconDiscussPostVote.ICreate;
  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: postA.id,
    body: voteBody,
  });

  // 5) Search with sort = trending
  const searchBody = {
    sort: "trending",
    page: 1,
    pageSize: 10,
  } satisfies IEconDiscussPost.IRequest;
  const page = await api.functional.econDiscuss.posts.patch(connection, {
    body: searchBody,
  });
  typia.assert(page);

  // Validate presence and precedence of Post A over Post B
  const ids = page.data.map((s) => s.id);
  const indexA = ids.indexOf(postA.id);
  const indexB = ids.indexOf(postB.id);

  TestValidator.predicate(
    "trending search should include recently upvoted post A",
    indexA >= 0,
  );
  TestValidator.predicate(
    "trending search should include non-upvoted control post B",
    indexB >= 0,
  );
  if (indexA >= 0 && indexB >= 0) {
    TestValidator.predicate(
      "recently upvoted post A ranks ahead of post B in trending",
      indexA < indexB,
    );
  }
}
