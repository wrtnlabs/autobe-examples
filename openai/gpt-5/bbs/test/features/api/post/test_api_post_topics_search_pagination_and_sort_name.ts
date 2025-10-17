import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussPostTopicSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostTopicSort";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostTopic";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussTopic";

/**
 * Verify public search with pagination and name-based sorting for a post's
 * attached topics.
 *
 * Steps:
 *
 * 1. Admin joins and creates three curated topics with distinct names
 * 2. Member joins and creates a post
 * 3. Member attaches all created topics to the post
 * 4. Publicly (unauthenticated) search post topics with page=1, limit=2,
 *    sort=name_asc
 * 5. Validate pagination metadata and alphabetical ordering
 * 6. Request page=2 and validate it contains the remaining topic in order
 */
export async function test_api_post_topics_search_pagination_and_sort_name(
  connection: api.IConnection,
) {
  // 1) Admin joins
  const adminAuth: IEconDiscussAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12), // >= 8 chars
        display_name: RandomGenerator.name(1),
        timezone: "Asia/Seoul",
        locale: "en-US",
      } satisfies IEconDiscussAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2) Admin creates curated topics with deterministic names
  const topicNames = ["Behavioral", "Development", "Econometrics"] as const;
  const topics: IEconDiscussTopic[] = [];
  for (const name of topicNames) {
    const created: IEconDiscussTopic =
      await api.functional.econDiscuss.admin.topics.create(connection, {
        body: {
          code: `${name.toLowerCase()}-${RandomGenerator.alphaNumeric(8)}`,
          name,
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies IEconDiscussTopic.ICreate,
      });
    typia.assert(created);
    topics.push(created);
  }

  // 3) Member joins
  const memberAuth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(1),
        timezone: "Asia/Seoul",
        locale: "en-US",
      } satisfies IEconDiscussMember.ICreate,
    });
  typia.assert(memberAuth);

  // 4) Member creates a host post
  const post: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconDiscussPost.ICreate,
    });
  typia.assert(post);

  // 5) Member attaches all topics to the post
  for (const t of topics) {
    const link: IEconDiscussPostTopic =
      await api.functional.econDiscuss.member.posts.topics.create(connection, {
        postId: post.id,
        body: {
          econ_discuss_topic_id: t.id,
        } satisfies IEconDiscussPostTopic.ICreate,
      });
    typia.assert(link);
  }

  // Prepare expected alphabetical order by name
  const expectedAscNames: string[] = [...topics]
    .map((t) => t.name)
    .sort((a, b) => a.localeCompare(b));

  // 6) Public (unauthenticated) search - page 1
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const page1: IPageIEconDiscussTopic.ISummary =
    await api.functional.econDiscuss.posts.topics.search(unauthConn, {
      postId: post.id,
      body: {
        q: null,
        page: 1,
        limit: 2,
        sort: "name_asc",
      } satisfies IEconDiscussPostTopic.IRequest,
    });
  typia.assert(page1);

  // Validate page 1
  TestValidator.equals("page1 current equals 1", page1.pagination.current, 1);
  TestValidator.equals("page1 limit equals 2", page1.pagination.limit, 2);
  TestValidator.equals("page1 data length equals 2", page1.data.length, 2);
  TestValidator.equals(
    "page1 names are first two alphabetically",
    page1.data.map((d) => d.name),
    expectedAscNames.slice(0, 2),
  );

  // Also validate total records/pages
  TestValidator.equals("total records equals 3", page1.pagination.records, 3);
  TestValidator.equals("total pages equals 2", page1.pagination.pages, 2);

  // 7) Public (unauthenticated) search - page 2
  const page2: IPageIEconDiscussTopic.ISummary =
    await api.functional.econDiscuss.posts.topics.search(unauthConn, {
      postId: post.id,
      body: {
        q: null,
        page: 2,
        limit: 2,
        sort: "name_asc",
      } satisfies IEconDiscussPostTopic.IRequest,
    });
  typia.assert(page2);

  // Validate page 2
  TestValidator.equals("page2 current equals 2", page2.pagination.current, 2);
  TestValidator.equals("page2 limit equals 2", page2.pagination.limit, 2);
  TestValidator.equals("page2 data length equals 1", page2.data.length, 1);
  TestValidator.equals(
    "page2 names are the remaining tail",
    page2.data.map((d) => d.name),
    expectedAscNames.slice(2),
  );

  // Cross-check: combined names from both pages equal expected in order
  const combined = [...page1.data, ...page2.data].map((d) => d.name);
  TestValidator.equals(
    "combined page1+page2 names match expected ascending order",
    combined,
    expectedAscNames,
  );
}
