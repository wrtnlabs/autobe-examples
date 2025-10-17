import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

/**
 * Validate authentication boundary for topic subscription.
 *
 * Steps:
 *
 * 1. Admin joins to obtain authorization (required to create a topic).
 * 2. Admin creates a topic.
 * 3. Create an unauthenticated connection clone.
 * 4. Attempt to subscribe to the topic without authentication and assert it fails.
 *
 * Notes:
 *
 * - We intentionally do not validate specific HTTP status codes; only that an
 *   error occurs.
 * - No subscription read/list API is provided, so we only verify the
 *   unauthenticated error behavior.
 */
export async function test_api_topic_subscription_unauthenticated_401(
  connection: api.IConnection,
) {
  // 1) Admin joins (authenticate as admin)
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

  // 2) Create a topic (admin-only)
  const topicCreateBody = {
    code: `topic-${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussTopic.ICreate;
  const topic = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: topicCreateBody,
    },
  );
  typia.assert(topic);

  // 3) Build an unauthenticated connection (allowed pattern)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4) Attempt to subscribe without authentication and expect an error
  await TestValidator.error(
    "unauthenticated users cannot subscribe to topics",
    async () => {
      await api.functional.econDiscuss.member.topics.subscribe.create(
        unauthConn,
        { topicId: topic.id },
      );
    },
  );
}
