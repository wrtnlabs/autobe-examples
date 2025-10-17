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
 * Validate filtering posts by author display name and ordering by newest.
 *
 * Business goal:
 *
 * - Ensure PATCH /econDiscuss/posts returns only posts authored by the specified
 *   author (via author display name), with correct pagination cap and
 *   newest-first ordering when sort="new".
 *
 * Scenario steps:
 *
 * 1. Register Member A and authenticate (token auto-applied by SDK).
 * 2. Create several posts as Member A, then update each to set
 *    scheduled_publish_at to a recent timestamp to make them eligible for
 *    listing.
 * 3. Register Member B and create some posts as well to ensure cross-author
 *    content exists.
 * 4. Search with author filter = Member A's display name, page=1, pageSize=50,
 *    sort="new".
 * 5. Validate that all returned summaries have author_user_id == Member A's id,
 *    data length does not exceed pageSize, and results are sorted by created_at
 *    descending.
 */
export async function test_api_post_search_author_filter(
  connection: api.IConnection,
) {
  // 1) Register Member A (author to filter)
  const memberAEmail: string = typia.random<string & tags.Format<"email">>();
  const memberAPassword: string = "Passw0rd!"; // >=8 chars
  const memberADisplayName: string = RandomGenerator.name(1);

  const authA = await api.functional.auth.member.join(connection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      display_name: memberADisplayName,
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authA);
  const authorAId = authA.id; // string & tags.Format<"uuid">

  // 2) Create multiple posts as Member A, then schedule immediate publish
  const createdA = await ArrayUtil.asyncRepeat(3, async () => {
    const created = await api.functional.econDiscuss.member.posts.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 5 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          summary: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies IEconDiscussPost.ICreate,
      },
    );
    typia.assert(created);

    // Trigger eligibility by setting scheduled_publish_at to near-present past
    const published = await api.functional.econDiscuss.member.posts.update(
      connection,
      {
        postId: created.id,
        body: {
          scheduled_publish_at: new Date(Date.now() - 1_000).toISOString(),
        } satisfies IEconDiscussPost.IUpdate,
      },
    );
    typia.assert(published);
    return published;
  });
  TestValidator.predicate(
    "created A posts count should be >= 3",
    createdA.length >= 3,
  );

  // 3) Register Member B (different author) and create some posts
  const memberBEmail: string = typia.random<string & tags.Format<"email">>();
  const memberBPassword: string = "Passw0rd!";
  const memberBDisplayName: string = RandomGenerator.name(1);

  const authB = await api.functional.auth.member.join(connection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
      display_name: memberBDisplayName,
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authB);

  const createdB = await ArrayUtil.asyncRepeat(2, async () => {
    const created = await api.functional.econDiscuss.member.posts.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 4 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          summary: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies IEconDiscussPost.ICreate,
      },
    );
    typia.assert(created);

    const published = await api.functional.econDiscuss.member.posts.update(
      connection,
      {
        postId: created.id,
        body: {
          scheduled_publish_at: new Date(Date.now() - 1_000).toISOString(),
        } satisfies IEconDiscussPost.IUpdate,
      },
    );
    typia.assert(published);
    return published;
  });
  TestValidator.predicate(
    "created B posts count should be >= 2",
    createdB.length >= 2,
  );

  // 4) Search with author filter = Member A's display name
  const pageSize = 50;
  const page = await api.functional.econDiscuss.posts.patch(connection, {
    body: {
      page: 1,
      pageSize,
      author: memberADisplayName,
      sort: "new",
    } satisfies IEconDiscussPost.IRequest,
  });
  typia.assert(page);

  // 5) Validations: all items belong to Member A, size cap, newest-first order
  TestValidator.predicate(
    "result length must be less than or equal to requested pageSize",
    page.data.length <= pageSize,
  );

  for (const summary of page.data) {
    TestValidator.equals(
      "every summary must belong to Member A",
      summary.author_user_id,
      authorAId,
    );
  }

  // Ensure sorted by created_at desc when sort="new"
  for (let i = 1; i < page.data.length; i++) {
    const prev = new Date(page.data[i - 1].created_at).getTime();
    const curr = new Date(page.data[i].created_at).getTime();
    TestValidator.predicate(
      `created_at must be non-increasing at index ${i}`,
      prev >= curr,
    );
  }
}
