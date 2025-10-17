import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussTopic";

export async function test_api_topics_public_listing_excludes_archived(
  connection: api.IConnection,
) {
  // 1) Admin join (authenticate for admin operations)
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2) Seed topics with unique codes; create a B (to archive) first, then A
  const suffix: string = RandomGenerator.alphaNumeric(8);

  const topicBCreate = {
    code: `labor-${suffix}`,
    name: "Labor Economics",
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussTopic.ICreate;
  const topicB = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: topicBCreate,
    },
  );
  typia.assert(topicB);

  // 3) Archive Topic B (soft-delete)
  await api.functional.econDiscuss.admin.topics.erase(connection, {
    topicId: topicB.id,
  });

  // Create Topic A after archiving B so A is likely included in the first page
  const topicACreate = {
    code: `macro-${suffix}`,
    name: "Macroeconomics",
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussTopic.ICreate;
  const topicA = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: topicACreate,
    },
  );
  typia.assert(topicA);

  // 4) Public listing should exclude archived topics
  const page = await api.functional.econDiscuss.topics.get(connection);
  typia.assert(page);

  // 5) Assertions: includes A (active), excludes B (archived)
  const includesA: boolean = page.data.some((t) => t.id === topicA.id);
  const includesB: boolean = page.data.some((t) => t.id === topicB.id);

  TestValidator.predicate(
    "active topic A appears in public listing",
    includesA,
  );
  TestValidator.predicate(
    "archived topic B must be excluded from public listing",
    !includesB,
  );
}
