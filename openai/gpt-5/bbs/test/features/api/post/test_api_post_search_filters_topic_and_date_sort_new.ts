import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostTopic";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPost";

/**
 * Advanced post search combining topicIds + date window + sort=new.
 *
 * Business goal:
 *
 * - Ensure that searching posts with a curated topic filter, an inclusive
 *   published-at date window, and sort=new returns only the expected post and
 *   orders results by newest.
 *
 * Scenario overview:
 *
 * 1. Join as admin and create a curated topic (taxonomy setup).
 * 2. Join as member and create two posts (fresh author ensures isolation).
 * 3. Attach the curated topic to only one of the posts.
 * 4. PATCH /econDiscuss/posts with filters { topicIds, dateFrom/dateTo, sort=new,
 *    author }.
 * 5. Expect only the tagged post in results, ordered by newest; validate
 *    pagination.
 *
 * Notes:
 *
 * - IEconDiscussPost.IUpdate does not include published_at; therefore we do not
 *   manipulate publication timestamps directly. We rely on immediate visibility
 *   and use a generous date window to include the new posts.
 */
export async function test_api_post_search_filters_topic_and_date_sort_new(
  connection: api.IConnection,
) {
  // 1) Admin joins
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234",
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(admin);

  // 1-2) Admin creates a curated topic
  const topic = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: `econ-${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(topic);

  // 2) Member joins
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234",
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);
  const authorDisplayName: string = typia.assert<string>(
    member.member?.displayName!,
  );

  // 2-1) Member creates two posts
  const post1 = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 12,
        }),
        summary: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post1);

  const post2 = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 12,
        }),
        summary: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post2);

  // 2-2) Optional: update one post (content-only, not publication timestamp)
  const updated1 = await api.functional.econDiscuss.member.posts.update(
    connection,
    {
      postId: post1.id,
      body: {
        summary: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IEconDiscussPost.IUpdate,
    },
  );
  typia.assert(updated1);

  // 3) Attach curated topic to only the first post
  const link = await api.functional.econDiscuss.member.posts.topics.create(
    connection,
    {
      postId: post1.id,
      body: {
        econ_discuss_topic_id: topic.id,
      } satisfies IEconDiscussPostTopic.ICreate,
    },
  );
  typia.assert(link);

  // 4) Build search window around now: include newly created posts
  const dateFrom: string & tags.Format<"date-time"> = new Date(
    Date.now() - 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const dateTo: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const pageSize = 10;

  const page = await api.functional.econDiscuss.posts.patch(connection, {
    body: {
      page: 1,
      pageSize,
      author: authorDisplayName,
      topicIds: [topic.id],
      dateFrom,
      dateTo,
      sort: "new",
    } satisfies IEconDiscussPost.IRequest,
  });
  typia.assert(page);

  // 5) Validations
  // 5-1) Only the tagged post is returned
  TestValidator.equals(
    "only one matching post should be returned",
    page.data.length,
    1,
  );
  const only = page.data[0]!;
  TestValidator.equals(
    "returned post id must match the tagged post",
    only.id,
    post1.id,
  );
  TestValidator.predicate(
    "untagged post must not appear in results",
    !page.data.some((s) => s.id === post2.id),
  );

  // 5-2) Sorting validation: ensure non-ascending by published_at (fallback created_at)
  const key = (s: IEconDiscussPost.ISummary) => s.published_at ?? s.created_at;
  TestValidator.predicate("results ordered by newest (desc)", () => {
    for (let i = 0; i + 1 < page.data.length; ++i) {
      const a = key(page.data[i]!);
      const b = key(page.data[i + 1]!);
      if (a < b) return false; // ISO strings compare lexicographically
    }
    return true;
  });

  // 5-3) Pagination metadata validation
  TestValidator.equals(
    "pagination.limit equals requested pageSize",
    page.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "pagination.records equals data length (1)",
    page.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination.pages equals 1 for single result",
    page.pagination.pages,
    1,
  );
  TestValidator.predicate(
    "pagination.current should be non-negative (typically 1)",
    page.pagination.current >= 0,
  );
}
