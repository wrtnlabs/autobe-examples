import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

/**
 * Validate idempotent unsubscription when no prior subscription exists.
 *
 * Business goal:
 *
 * - Ensure DELETE /econDiscuss/member/topics/{topicId}/subscribe behaves as a
 *   no-op (idempotent) when the user has not previously subscribed to the
 *   topic.
 * - Verify authentication boundary: unauthenticated request should fail.
 *
 * Steps:
 *
 * 1. Admin joins (auth header set by SDK) → create a topic
 * 2. Member joins (auth header switched to member by SDK)
 * 3. Member unsubscribes once (no prior subscription) → should succeed silently
 *    (void)
 * 4. Member unsubscribes again → should still succeed (idempotent)
 * 5. Unauthenticated connection attempts to unsubscribe → should throw (auth
 *    boundary)
 */
export async function test_api_topic_unsubscription_without_existing_subscription(
  connection: api.IConnection,
) {
  // 1) Admin joins (authorization header will be managed automatically by SDK)
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(admin);

  // 2) Admin creates a topic
  const topic = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: `topic-${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(topic);

  // 3) Member joins (authorization header switched to member by SDK)
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 4) First unsubscription attempt (no prior subscription) → should succeed (void)
  await api.functional.econDiscuss.member.topics.subscribe.erase(connection, {
    topicId: topic.id,
  });

  // 5) Second unsubscription attempt → still succeed (idempotent)
  await api.functional.econDiscuss.member.topics.subscribe.erase(connection, {
    topicId: topic.id,
  });

  // 6) Authentication boundary: unauthenticated request should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated unsubscribe should fail",
    async () => {
      await api.functional.econDiscuss.member.topics.subscribe.erase(
        unauthConn,
        {
          topicId: topic.id,
        },
      );
    },
  );
}
