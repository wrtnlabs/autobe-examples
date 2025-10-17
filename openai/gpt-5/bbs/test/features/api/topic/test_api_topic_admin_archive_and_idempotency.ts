import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

/**
 * Admin-only topic archival with idempotency and auth boundary checks.
 *
 * Validates that:
 *
 * 1. An administrator can archive (soft-delete) a topic.
 * 2. The DELETE endpoint is idempotent (repeated calls succeed without error).
 * 3. The endpoint is protected: unauthenticated requests fail.
 * 4. Deleting a random, well-formed UUID fails (treated as not found).
 *
 * Notes:
 *
 * - Public GET verification after delete is omitted because the provided SDK set
 *   does not include a public GET endpoint for topics.
 * - No HTTP status code assertions are performed; only success/error semantics
 *   are validated per testing policy.
 */
export async function test_api_topic_admin_archive_and_idempotency(
  connection: api.IConnection,
) {
  // 1) Admin authentication (join) → SDK auto-sets Authorization header
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12), // >= 8 chars
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(adminAuth); // IEconDiscussAdmin.IAuthorized

  // 2) Happy path archival + idempotency
  // 2-1) Create a topic to archive
  const topicToArchive = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: `topic-${RandomGenerator.alphaNumeric(10)}`,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(topicToArchive);

  // 2-2) First DELETE should succeed (void)
  await api.functional.econDiscuss.admin.topics.erase(connection, {
    topicId: topicToArchive.id,
  });

  // 2-3) Second DELETE on the same topic validates idempotency (no error)
  await api.functional.econDiscuss.admin.topics.erase(connection, {
    topicId: topicToArchive.id,
  });

  // 3) Auth boundary: unauthenticated DELETE attempt should error
  // Create another topic to target with unauthenticated connection
  const otherTopic = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: `topic-${RandomGenerator.alphaNumeric(10)}`,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(otherTopic);

  // Build a fresh, unauthenticated connection (no headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthenticated delete must fail", async () => {
    await api.functional.econDiscuss.admin.topics.erase(unauthConn, {
      topicId: otherTopic.id,
    });
  });

  // 4) Not found: DELETE with a random well-formed UUID should fail
  await TestValidator.error("delete of random uuid should fail", async () => {
    await api.functional.econDiscuss.admin.topics.erase(connection, {
      topicId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
