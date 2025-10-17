import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IESortDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortDirection";
import type { IETopicSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IETopicSortBy";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussTopic";

/**
 * Verify that topic search returns an empty page for an unknown keyword.
 *
 * Steps
 *
 * 1. Join as admin to obtain authorization (SDK auto-injects token)
 * 2. Seed several topics via admin create to ensure a non-empty catalog
 * 3. Search with a clearly non-existent keyword using PATCH /econDiscuss/topics
 * 4. Validate that the response is successful with empty data and consistent
 *    pagination
 */
export async function test_api_topics_search_no_results_for_unknown_keyword(
  connection: api.IConnection,
) {
  // 1) Admin join (obtain token)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2) Seed topics (create a few curated topics)
  const topicBodies: IEconDiscussTopic.ICreate[] = [
    {
      code: `macro_${RandomGenerator.alphaNumeric(8)}`,
      name: `Macro ${RandomGenerator.name(1)}`,
      description: RandomGenerator.paragraph({ sentences: 8 }),
    },
    {
      code: `labor_${RandomGenerator.alphaNumeric(8)}`,
      name: `Labor ${RandomGenerator.name(1)}`,
      description: RandomGenerator.paragraph({ sentences: 8 }),
    },
    {
      code: `trade_${RandomGenerator.alphaNumeric(8)}`,
      name: `Trade ${RandomGenerator.name(1)}`,
      description: RandomGenerator.paragraph({ sentences: 8 }),
    },
  ];

  for (const body of topicBodies) {
    const created = await api.functional.econDiscuss.admin.topics.create(
      connection,
      { body: body satisfies IEconDiscussTopic.ICreate },
    );
    typia.assert(created);
  }

  // 3) Negative keyword search
  const searchKeyword = "nonexistent-keyword-zzz";
  const searchBody = {
    q: searchKeyword,
    page: 1,
    limit: 5,
  } satisfies IEconDiscussTopic.IRequest;
  const page = await api.functional.econDiscuss.topics.patch(connection, {
    body: searchBody,
  });
  typia.assert(page);

  // 4) Assertions
  TestValidator.equals(
    "unknown keyword should return empty data",
    page.data.length,
    0,
  );
  TestValidator.equals(
    "pagination.records should be zero for unknown keyword",
    page.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be zero for zero records",
    page.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination.limit should echo requested limit",
    page.pagination.limit,
    searchBody.limit,
  );
}
