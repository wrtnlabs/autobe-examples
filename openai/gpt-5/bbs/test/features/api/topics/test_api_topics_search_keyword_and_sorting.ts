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
 * Validate keyword search and alphabetical sorting over public topics.
 *
 * Flow:
 *
 * 1. Admin joins to obtain authorization for admin-only topic creation
 * 2. Seed 3 topics (macro, labor, trade) – each description includes "Eco"
 * 3. Archive one topic (trade) to verify exclusion from public search
 * 4. Search topics with q = "Eco", sortBy = name, sortDir = asc
 * 5. Assert: (a) non-archived seeded topics are present, (b) archived topic is
 *    absent, and (c) relative ordering by name asc (Labor Economics before
 *    Macroeconomics)
 */
export async function test_api_topics_search_keyword_and_sorting(
  connection: api.IConnection,
) {
  // 1) Admin join (authorization handled by SDK internally)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2) Seed topics
  const suffix = RandomGenerator.alphaNumeric(6);

  const macroCreate = {
    code: `macro-${suffix}`,
    name: "Macroeconomics",
    description: "Eco macro policy and aggregates",
  } satisfies IEconDiscussTopic.ICreate;
  const macro = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: macroCreate,
    },
  );
  typia.assert(macro);

  const laborCreate = {
    code: `labor-${suffix}`,
    name: "Labor Economics",
    description: "Eco labor markets and employment",
  } satisfies IEconDiscussTopic.ICreate;
  const labor = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: laborCreate,
    },
  );
  typia.assert(labor);

  const tradeCreate = {
    code: `trade-${suffix}`,
    name: "International Trade",
    description: "Eco trade flows and policy",
  } satisfies IEconDiscussTopic.ICreate;
  const trade = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: tradeCreate,
    },
  );
  typia.assert(trade);

  // 3) Archive the trade topic
  await api.functional.econDiscuss.admin.topics.erase(connection, {
    topicId: trade.id,
  });

  // 4) Search topics with keyword and sorting
  const searchBody = {
    q: "Eco",
    sortBy: "name",
    sortDir: "asc",
    limit: 50,
  } satisfies IEconDiscussTopic.IRequest;
  const page = await api.functional.econDiscuss.topics.patch(connection, {
    body: searchBody,
  });
  typia.assert(page);

  // 5) Validations
  const rows = page.data;

  // Presence of non-archived topics
  TestValidator.predicate(
    "macro topic should be present in search results",
    rows.some((r) => r.code === macro.code),
  );
  TestValidator.predicate(
    "labor topic should be present in search results",
    rows.some((r) => r.code === labor.code),
  );

  // Absence of archived topic
  TestValidator.predicate(
    "archived trade topic should be excluded from results",
    rows.every((r) => r.code !== trade.code),
  );

  // Relative ordering by name asc: Labor Economics before Macroeconomics
  const idxLabor = rows.findIndex((r) => r.code === labor.code);
  const idxMacro = rows.findIndex((r) => r.code === macro.code);
  TestValidator.predicate(
    "Labor Economics should precede Macroeconomics in name asc order",
    idxLabor >= 0 && idxMacro >= 0 && idxLabor < idxMacro,
  );
}
