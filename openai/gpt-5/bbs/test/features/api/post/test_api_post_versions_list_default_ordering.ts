import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostSnapshot";

/**
 * List post version snapshots in default order and validate mapping to edit
 * history.
 *
 * Purpose
 *
 * - Ensure GET /econDiscuss/posts/{postId}/versions returns a paginated list of
 *   IEconDiscussPostSnapshot in a consistent default order (newest first) and
 *   that snapshot contents match the actual edit history.
 *
 * Steps
 *
 * 1. Join as a member to obtain an authenticated session.
 * 2. Create a post (v1) and record its returned fields as the initial state.
 * 3. Apply three updates (v2..v4), recording each returned post state for content
 *    verification.
 * 4. List versions for the post and validate:
 *
 *    - Type safety via typia.assert
 *    - Non-increasing version numbers (newest first)
 *    - Snapshot titles/bodies/summary match recorded edits in reverse order
 *    - Pagination metadata coherence
 * 5. Negative: unknown postId → expect an error (no specific status asserted).
 */
export async function test_api_post_versions_list_default_ordering(
  connection: api.IConnection,
) {
  // 1) Join as member (auth)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Create a new post (initial version v1)
  const createBody = {
    title: `V1 ${RandomGenerator.paragraph({ sentences: 3 })}`,
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussPost.ICreate;
  const created: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Record expected states (from server responses) for reverse-order mapping
  const expectedStates: Array<{
    title: string;
    body: string;
    summary: string | null | undefined;
    published_at: (string & tags.Format<"date-time">) | null | undefined;
  }> = [];
  expectedStates.push({
    title: created.title,
    body: created.body,
    summary: created.summary ?? null,
    published_at: created.published_at ?? null,
  });

  // 3) Apply multiple updates to create more snapshots (v2..v4)
  const updateBody1 = {
    title: `V2 ${RandomGenerator.paragraph({ sentences: 3 })}`,
  } satisfies IEconDiscussPost.IUpdate;
  const updated1: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.update(connection, {
      postId: created.id,
      body: updateBody1,
    });
  typia.assert(updated1);
  expectedStates.push({
    title: updated1.title,
    body: updated1.body,
    summary: updated1.summary ?? null,
    published_at: updated1.published_at ?? null,
  });

  const updateBody2 = {
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IEconDiscussPost.IUpdate;
  const updated2: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.update(connection, {
      postId: created.id,
      body: updateBody2,
    });
  typia.assert(updated2);
  expectedStates.push({
    title: updated2.title,
    body: updated2.body,
    summary: updated2.summary ?? null,
    published_at: updated2.published_at ?? null,
  });

  const updateBody3 = {
    title: `V3 ${RandomGenerator.paragraph({ sentences: 2 })}`,
    summary: null,
  } satisfies IEconDiscussPost.IUpdate;
  const updated3: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.update(connection, {
      postId: created.id,
      body: updateBody3,
    });
  typia.assert(updated3);
  expectedStates.push({
    title: updated3.title,
    body: updated3.body,
    summary: updated3.summary ?? null,
    published_at: updated3.published_at ?? null,
  });

  // 4) List versions and validate ordering, mapping, and pagination
  const page: IPageIEconDiscussPostSnapshot =
    await api.functional.econDiscuss.posts.versions.list(connection, {
      postId: created.id,
    });
  typia.assert(page);

  // Validate non-increasing version order (newest first)
  const sortedDesc: boolean = page.data.every((s, i, arr) =>
    i === 0 ? true : arr[i - 1].version >= s.version,
  );
  TestValidator.predicate(
    "versions should be ordered by version descending (newest first)",
    sortedDesc,
  );

  // Map top N snapshots to the last N edits in reverse (latest edit first)
  const compareCount = Math.min(expectedStates.length, page.data.length);
  for (let i = 0; i < compareCount; i++) {
    const expected = expectedStates[expectedStates.length - 1 - i];
    const actual = page.data[i];

    TestValidator.equals(
      `snapshot[${i}] title matches expected edit in reverse order`,
      actual.title,
      expected.title,
    );
    TestValidator.equals(
      `snapshot[${i}] body matches expected edit in reverse order`,
      actual.body,
      expected.body,
    );
    TestValidator.equals(
      `snapshot[${i}] summary matches expected edit in reverse order`,
      actual.summary ?? null,
      expected.summary ?? null,
    );
    TestValidator.equals(
      `snapshot[${i}] published_at coherence`,
      actual.published_at ?? null,
      expected.published_at ?? null,
    );
  }

  // Pagination metadata coherence checks
  TestValidator.predicate(
    "pagination.limit must be >= 1",
    page.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination.records must be >= returned data length",
    page.pagination.records >= page.data.length,
  );
  TestValidator.predicate(
    "pagination.pages must be >= 1",
    page.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination.current must be >= 0",
    page.pagination.current >= 0,
  );

  // 5) Negative case: unknown postId must error (no specific status asserted)
  let unknownId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (unknownId === created.id)
    unknownId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "listing versions for unknown post should fail",
    async () => {
      await api.functional.econDiscuss.posts.versions.list(connection, {
        postId: unknownId,
      });
    },
  );
}
