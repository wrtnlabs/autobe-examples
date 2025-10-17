import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussPostVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostVoteStatus";
import type { IEEconDiscussPostVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostVoteType";
import type { IEEconDiscussVoteSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteSortBy";
import type { IEEconDiscussVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteStatus";
import type { IEEconDiscussVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteType";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostVote";

/**
 * Verify member vote history search: filters, default ordering, and pagination.
 *
 * Business context
 *
 * - A voter can review their post-vote history with filters (voteType, status),
 *   default sort (createdAt desc), and pagination.
 * - Lifecycle events are modeled as a single row per (user, post) with status
 *   transitions (active → withdrawn/switched). Idempotent re-posts of the same
 *   vote_type must not create duplicates.
 *
 * End-to-end flow
 *
 * 1. Join as authorUser and create two posts (postA, postB).
 * 2. Join as voterUser and record a time marker (votingStartedAt) right before
 *    casting votes.
 * 3. PostA: upvote, then withdraw → expect status "withdrawn" in history.
 * 4. PostB: downvote, then change to up; repeat upvote to validate idempotency →
 *    expect status "switched" and voteType "up" in history.
 * 5. Search baseline (createdFrom=votingStartedAt) and verify ordering (createdAt
 *    desc) and presence of both post records.
 * 6. Search with status filter withdrawn → only postA appears.
 * 7. Search with voteType filter up → records must be vote_type up and include the
 *    switched postB entry.
 * 8. Pagination check: pageSize=1 → page 1 then page 2 align with baseline
 *    ordering.
 */
export async function test_api_vote_history_search_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1) Join as authorUser
  const authorJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorJoin);

  // 2) Author creates two posts
  const postA = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(postA);

  const postB = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(postB);

  // 3) Join as voterUser (switches SDK auth context automatically)
  const voterJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(voterJoin);

  // Time marker to bound search results to only this test's votes
  const votingStartedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // 4) Cast and mutate votes as voterUser
  // postA: upvote then withdraw → status should become withdrawn
  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: postA.id,
    body: { vote_type: "up" } satisfies IEconDiscussPostVote.ICreate,
  });
  await api.functional.econDiscuss.member.posts.votes.self.erase(connection, {
    postId: postA.id,
  });

  // postB: downvote → change to up (switched). Repeat upvote to check idempotency
  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: postB.id,
    body: { vote_type: "down" } satisfies IEconDiscussPostVote.ICreate,
  });
  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: postB.id,
    body: { vote_type: "up" } satisfies IEconDiscussPostVote.ICreate,
  });
  // idempotent repeat (no error, no duplicate row)
  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: postB.id,
    body: { vote_type: "up" } satisfies IEconDiscussPostVote.ICreate,
  });

  // Helper: milliseconds from ISO
  const toMs = (iso: string): number => new Date(iso).getTime();

  // 5) Baseline history (createdFrom=votingStartedAt)
  const baseline = await api.functional.econDiscuss.member.me.votes.search(
    connection,
    {
      body: {
        page: 1,
        pageSize: 10,
        createdFrom: votingStartedAt,
      } satisfies IEconDiscussPostVote.IRequest,
    },
  );
  typia.assert(baseline);

  // Ensure at least our two records exist
  TestValidator.predicate(
    "baseline should contain at least two vote records",
    baseline.data.length >= 2,
  );

  // Verify default ordering: createdAt desc
  for (let i = 1; i < baseline.data.length; i++) {
    const prev = baseline.data[i - 1];
    const curr = baseline.data[i];
    TestValidator.predicate(
      `baseline order by createdAt desc at index ${i}`,
      toMs(prev.createdAt) >= toMs(curr.createdAt),
    );
  }

  // Locate our two target records
  const recA = baseline.data.find((r) => r.postId === postA.id);
  const recB = baseline.data.find((r) => r.postId === postB.id);
  TestValidator.predicate("record for postA must exist", !!recA);
  TestValidator.predicate("record for postB must exist", !!recB);
  if (recA && recB) {
    TestValidator.equals("postA status is withdrawn", recA.status, "withdrawn");
    TestValidator.equals("postB status is switched", recB.status, "switched");
    TestValidator.equals("postB voteType is up", recB.voteType, "up");
  }

  // 6) Filter by status=withdrawn → expect only postA
  const onlyWithdrawn = await api.functional.econDiscuss.member.me.votes.search(
    connection,
    {
      body: {
        page: 1,
        pageSize: 10,
        status: "withdrawn",
        createdFrom: votingStartedAt,
      } satisfies IEconDiscussPostVote.IRequest,
    },
  );
  typia.assert(onlyWithdrawn);
  TestValidator.predicate(
    "all results are withdrawn",
    onlyWithdrawn.data.every((d) => d.status === "withdrawn"),
  );
  TestValidator.equals(
    "withdrawn set contains exactly one record for postA",
    onlyWithdrawn.data.length,
    1,
  );
  if (onlyWithdrawn.data.length === 1) {
    TestValidator.equals(
      "withdrawn record is for postA",
      onlyWithdrawn.data[0].postId,
      postA.id,
    );
  }

  // 7) Filter by voteType=up → must include switched postB, and all voteType=up
  const onlyUp = await api.functional.econDiscuss.member.me.votes.search(
    connection,
    {
      body: {
        page: 1,
        pageSize: 10,
        voteType: "up",
        createdFrom: votingStartedAt,
      } satisfies IEconDiscussPostVote.IRequest,
    },
  );
  typia.assert(onlyUp);
  TestValidator.predicate(
    "all results are voteType up",
    onlyUp.data.every((d) => d.voteType === "up"),
  );
  TestValidator.predicate(
    "includes postB switched to up",
    onlyUp.data.some((d) => d.postId === postB.id && d.status === "switched"),
  );

  // 8) Pagination: pageSize=1, verify order aligns with baseline
  const page1 = await api.functional.econDiscuss.member.me.votes.search(
    connection,
    {
      body: {
        page: 1,
        pageSize: 1,
        createdFrom: votingStartedAt,
      } satisfies IEconDiscussPostVote.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page1 contains one item", page1.data.length, 1);

  const page2 = await api.functional.econDiscuss.member.me.votes.search(
    connection,
    {
      body: {
        page: 2,
        pageSize: 1,
        createdFrom: votingStartedAt,
      } satisfies IEconDiscussPostVote.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page2 contains one item", page2.data.length, 1);

  // Baseline first two records should match page1 and page2 heads
  const baselineFirstTwo = baseline.data.slice(0, 2);
  if (baselineFirstTwo.length >= 2) {
    TestValidator.equals(
      "page1 first equals baseline[0]",
      page1.data[0].id,
      baselineFirstTwo[0].id,
    );
    TestValidator.equals(
      "page2 first equals baseline[1]",
      page2.data[0].id,
      baselineFirstTwo[1].id,
    );
  }
}
