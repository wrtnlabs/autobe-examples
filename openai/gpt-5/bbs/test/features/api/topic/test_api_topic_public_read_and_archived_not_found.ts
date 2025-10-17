import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

/**
 * Validate public topic retrieval for active records and ensure archived topics
 * are hidden.
 *
 * Business context:
 *
 * - Curated topics are publicly readable when active.
 * - Admins can create and archive topics. Archived topics must not be retrievable
 *   by the public endpoint.
 *
 * Steps:
 *
 * 1. Admin joins (to gain privileges)
 * 2. Admin creates Topic A (active)
 * 3. Public GET Topic A (no Authorization header) → success
 * 4. Admin creates Topic B, then archives it
 * 5. Public GET Topic B (no Authorization header) → error (hidden)
 */
export async function test_api_topic_public_read_and_archived_not_found(
  connection: api.IConnection,
) {
  // 1) Admin joins
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123", // >= 8 chars
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // Prepare an unauthenticated connection for public read tests
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 2) Create Topic A (active)
  const topicACreateBody = {
    code: `topic-${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussTopic.ICreate;
  const topicA = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: topicACreateBody,
    },
  );
  typia.assert(topicA);

  // 3) Public GET Topic A (no Authorization header)
  const publicA = await api.functional.econDiscuss.topics.at(publicConn, {
    topicId: topicA.id,
  });
  typia.assert(publicA);

  // Business validations for active topic read
  TestValidator.equals(
    "public GET of active topic returns the same id",
    publicA.id,
    topicA.id,
  );
  TestValidator.equals(
    "public GET of active topic returns the same code",
    publicA.code,
    topicA.code,
  );
  TestValidator.equals(
    "public GET of active topic returns the same name",
    publicA.name,
    topicA.name,
  );

  // 4) Create Topic B, then archive it
  const topicBCreateBody = {
    code: `topic-${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IEconDiscussTopic.ICreate;
  const topicB = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: topicBCreateBody,
    },
  );
  typia.assert(topicB);

  await api.functional.econDiscuss.admin.topics.erase(connection, {
    topicId: topicB.id,
  });

  // 5) Public GET Topic B must fail (archived topics are hidden)
  await TestValidator.error(
    "public GET of archived topic should fail",
    async () => {
      await api.functional.econDiscuss.topics.at(publicConn, {
        topicId: topicB.id,
      });
    },
  );
}
