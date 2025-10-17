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
 * Validate post snapshot search with pagination, sorting, and version-range
 * filters.
 *
 * Business flow:
 *
 * 1. Join as a new econDiscuss member (authentication handled by SDK).
 * 2. Create a post (initial state captured by snapshot policy).
 * 3. Update the post 3 times to generate multiple snapshots.
 * 4. Query versions with various parameters:
 *
 *    - Latest only (version desc, page=1, size=1) → must match last update content
 *    - Ascending full list → verify ordering and that version 1 matches initial
 *         content
 *    - Descending full list → verify it equals reversed ascending by version numbers
 *    - Version range (min/max) with desc → results within bounds and ordered
 *    - Boundary page beyond available → empty data array
 * 5. Negative: unknown postId should error (no specific status code assertion).
 */
export async function test_api_post_versions_search_pagination_sorting(
  connection: api.IConnection,
) {
  // 1) Authenticate as member
  const joinOutput = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(joinOutput);

  // 2) Create a post (initial version content)
  const titleV1 = `Post V1 ${RandomGenerator.alphabets(6)}`;
  const bodyV1 = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 6,
    sentenceMax: 12,
  });
  const summaryV1 = RandomGenerator.paragraph({ sentences: 6 });

  const createdPost = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: titleV1,
        body: bodyV1,
        summary: summaryV1,
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(createdPost);

  // 3) Perform 3 successive updates to ensure multiple snapshots
  const titleV2 = `Post V2 ${RandomGenerator.alphabets(6)}`;
  const bodyV2 = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const updated1 = await api.functional.econDiscuss.member.posts.update(
    connection,
    {
      postId: createdPost.id,
      body: {
        title: titleV2,
        body: bodyV2,
      } satisfies IEconDiscussPost.IUpdate,
    },
  );
  typia.assert(updated1);

  const titleV3 = `Post V3 ${RandomGenerator.alphabets(6)}`;
  const bodyV3 = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 4,
    sentenceMax: 9,
  });
  const updated2 = await api.functional.econDiscuss.member.posts.update(
    connection,
    {
      postId: createdPost.id,
      body: {
        title: titleV3,
        body: bodyV3,
        summary: null,
      } satisfies IEconDiscussPost.IUpdate,
    },
  );
  typia.assert(updated2);

  const titleV4 = `Post V4 ${RandomGenerator.alphabets(6)}`;
  const bodyV4 = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 12,
  });
  const summaryV4 = RandomGenerator.paragraph({ sentences: 4 });
  const updated3 = await api.functional.econDiscuss.member.posts.update(
    connection,
    {
      postId: createdPost.id,
      body: {
        title: titleV4,
        body: bodyV4,
        summary: summaryV4,
      } satisfies IEconDiscussPost.IUpdate,
    },
  );
  typia.assert(updated3);

  // 4-1) Latest snapshot (version desc, one item)
  const latestPage = await api.functional.econDiscuss.posts.versions.index(
    connection,
    {
      postId: createdPost.id,
      body: {
        page: 1,
        pageSize: 1,
        sort_by: "version",
        order: "desc",
      } satisfies IEconDiscussPostSnapshot.IRequest,
    },
  );
  typia.assert(latestPage);
  TestValidator.predicate(
    "latest page contains exactly one snapshot",
    latestPage.data.length === 1,
  );
  const latest = latestPage.data[0];
  TestValidator.equals(
    "latest snapshot title equals last update title",
    latest.title,
    titleV4,
  );
  TestValidator.equals(
    "latest snapshot body equals last update body",
    latest.body,
    bodyV4,
  );

  // 4-2) Ascending full list (use large pageSize to cover all)
  const ascAll = await api.functional.econDiscuss.posts.versions.index(
    connection,
    {
      postId: createdPost.id,
      body: {
        page: 1,
        pageSize: 100,
        sort_by: "version",
        order: "asc",
      } satisfies IEconDiscussPostSnapshot.IRequest,
    },
  );
  typia.assert(ascAll);
  TestValidator.predicate(
    "at least one snapshot should exist after updates",
    ascAll.data.length >= 1,
  );
  TestValidator.predicate(
    "ascending order by version is monotonic non-decreasing",
    ascAll.data.every((s, i, a) => i === 0 || a[i - 1].version <= s.version),
  );
  // Correlate earliest snapshot to initial content
  const firstSnap = ascAll.data[0];
  TestValidator.equals(
    "first snapshot title matches initial",
    firstSnap.title,
    titleV1,
  );
  TestValidator.equals(
    "first snapshot body matches initial",
    firstSnap.body,
    bodyV1,
  );

  // 4-3) Descending list should be reverse of ascending by version numbers
  const descAll = await api.functional.econDiscuss.posts.versions.index(
    connection,
    {
      postId: createdPost.id,
      body: {
        page: 1,
        pageSize: 100,
        sort_by: "version",
        order: "desc",
      } satisfies IEconDiscussPostSnapshot.IRequest,
    },
  );
  typia.assert(descAll);
  const ascVersions = ascAll.data.map((s) => s.version);
  const descVersions = descAll.data.map((s) => s.version);
  const reversedAsc = [...ascVersions].reverse();
  TestValidator.equals(
    "descending versions equal reversed ascending versions",
    descVersions,
    reversedAsc,
  );

  // 4-4) Version range filter (only if at least 2 snapshots exist)
  if (ascAll.data.length >= 2) {
    const minVersion = ascAll.data[0].version;
    const maxVersion = ascAll.data[1].version;
    const ranged = await api.functional.econDiscuss.posts.versions.index(
      connection,
      {
        postId: createdPost.id,
        body: {
          page: 1,
          pageSize: 50,
          sort_by: "version",
          order: "desc",
          version_min: minVersion satisfies number as number,
          version_max: maxVersion satisfies number as number,
        } satisfies IEconDiscussPostSnapshot.IRequest,
      },
    );
    typia.assert(ranged);
    TestValidator.predicate(
      "range filter returns only versions within inclusive bounds",
      ranged.data.every(
        (s) => s.version >= minVersion && s.version <= maxVersion,
      ),
    );
    TestValidator.predicate(
      "range filter maintains desc ordering by version",
      ranged.data.every((s, i, a) => i === 0 || a[i - 1].version >= s.version),
    );
  }

  // 4-5) Boundary: page beyond available should return empty data array
  const beyond = await api.functional.econDiscuss.posts.versions.index(
    connection,
    {
      postId: createdPost.id,
      body: {
        page: (ascAll.pagination.pages + 1) satisfies number as number,
        pageSize: 100,
        sort_by: "version",
        order: "desc",
      } satisfies IEconDiscussPostSnapshot.IRequest,
    },
  );
  typia.assert(beyond);
  TestValidator.equals(
    "requesting page beyond total pages yields empty data array",
    beyond.data.length,
    0,
  );

  // 5) Negative: unknown postId returns an error (no status code assertion)
  await TestValidator.error("unknown postId should cause error", async () => {
    await api.functional.econDiscuss.posts.versions.index(connection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 1,
        pageSize: 1,
        sort_by: "version",
        order: "desc",
      } satisfies IEconDiscussPostSnapshot.IRequest,
    });
  });
}
