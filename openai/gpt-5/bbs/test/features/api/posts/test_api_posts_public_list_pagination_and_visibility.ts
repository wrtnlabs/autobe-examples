import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPost";

/**
 * Validate public post listing pagination and visibility rules.
 *
 * Business goal: Ensure GET /econDiscuss/posts returns only visible posts
 * (published_at != null and not future-scheduled) ordered by recency
 * (published_at desc), with sane default pagination. Also ensure members can
 * author posts whose scheduling controls visibility.
 *
 * Steps:
 *
 * 1. Register a member (auth join) to obtain authenticated session.
 * 2. Create two posts with scheduled_publish_at in the past, making them
 *    immediately visible as published with distinct recency.
 * 3. Create a third post scheduled in the future (should be excluded from the
 *    public list).
 * 4. GET /econDiscuss/posts and validate:
 *
 *    - Response typing and structure
 *    - All items have non-null published_at (visibility)
 *    - Default pagination integrity (limit >= data.length, non-negative fields)
 *    - Descending ordering by published_at
 *    - Two past-scheduled posts appear; the future-scheduled post does not
 *    - If both created posts appear, their relative order matches recency
 */
export async function test_api_posts_public_list_pagination_and_visibility(
  connection: api.IConnection,
) {
  // 1) Register a member to authenticate
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // Prepare timestamps
  const now = new Date();
  const past1 = new Date(now.getTime() - 60 * 1000).toISOString(); // newer (more recent)
  const past2 = new Date(now.getTime() - 120 * 1000).toISOString(); // older
  const future = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  // Helper content
  const titleA = RandomGenerator.paragraph({ sentences: 3 });
  const titleB = RandomGenerator.paragraph({ sentences: 3 });
  const titleFuture = RandomGenerator.paragraph({ sentences: 3 });

  const bodyA = RandomGenerator.content({ paragraphs: 2 });
  const bodyB = RandomGenerator.content({ paragraphs: 2 });
  const bodyFuture = RandomGenerator.content({ paragraphs: 2 });

  const summaryA = RandomGenerator.paragraph({ sentences: 8 });
  const summaryB = RandomGenerator.paragraph({ sentences: 8 });
  const summaryFuture = RandomGenerator.paragraph({ sentences: 8 });

  // 2) Create two immediately visible posts (scheduled in the past)
  const createBodyA = {
    title: titleA,
    body: bodyA,
    summary: summaryA,
    scheduled_publish_at: past1,
  } satisfies IEconDiscussPost.ICreate;
  const postA = await api.functional.econDiscuss.member.posts.create(
    connection,
    { body: createBodyA },
  );
  typia.assert(postA);

  const createBodyB = {
    title: titleB,
    body: bodyB,
    summary: summaryB,
    scheduled_publish_at: past2,
  } satisfies IEconDiscussPost.ICreate;
  const postB = await api.functional.econDiscuss.member.posts.create(
    connection,
    { body: createBodyB },
  );
  typia.assert(postB);

  // 3) Create a future-scheduled post (should be excluded)
  const createBodyFuture = {
    title: titleFuture,
    body: bodyFuture,
    summary: summaryFuture,
    scheduled_publish_at: future,
  } satisfies IEconDiscussPost.ICreate;
  const postFuture = await api.functional.econDiscuss.member.posts.create(
    connection,
    { body: createBodyFuture },
  );
  typia.assert(postFuture);

  // 4) Public listing
  const page = await api.functional.econDiscuss.posts.get(connection);
  typia.assert(page);

  // Visibility: every item must have non-null published_at
  const allHavePublishedAt = page.data.every(
    (d) => d.published_at !== null && d.published_at !== undefined,
  );
  TestValidator.predicate(
    "all listed items have non-null published_at",
    allHavePublishedAt,
  );

  // Pagination integrity
  TestValidator.predicate(
    "pagination.limit >= data length",
    page.pagination.limit >= page.data.length,
  );
  TestValidator.predicate(
    "pagination fields are non-negative",
    page.pagination.current >= 0 &&
      page.pagination.limit >= 0 &&
      page.pagination.records >= 0 &&
      page.pagination.pages >= 0,
  );

  // Descending ordering by published_at
  const times = page.data.map((d) =>
    new Date(
      typia.assert<string & tags.Format<"date-time">>(d.published_at!),
    ).getTime(),
  );
  const sortedDesc = times.every((t, i, arr) => i === 0 || arr[i - 1] >= t);
  TestValidator.predicate(
    "results are sorted by published_at desc",
    sortedDesc,
  );

  // Newly created past-scheduled posts should appear (they are the newest)
  const ids = page.data.map((d) => d.id);
  const idxA = ids.findIndex((id) => id === postA.id);
  const idxB = ids.findIndex((id) => id === postB.id);

  TestValidator.predicate(
    "first past-scheduled post appears in the first page",
    idxA >= 0,
  );
  TestValidator.predicate(
    "second past-scheduled post appears in the first page",
    idxB >= 0,
  );

  // Future scheduled post must be excluded
  const futurePresent = ids.includes(postFuture.id);
  TestValidator.predicate(
    "future-scheduled post is excluded from public listing",
    futurePresent === false,
  );

  // If both present, verify relative order by recency (postA newer than postB)
  if (idxA >= 0 && idxB >= 0) {
    TestValidator.predicate(
      "newer post appears before older post in listing",
      idxA < idxB,
    );
  }
}
