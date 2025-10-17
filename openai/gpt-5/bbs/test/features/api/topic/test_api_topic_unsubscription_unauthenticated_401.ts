import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

/**
 * Reject unauthenticated topic unsubscription.
 *
 * Purpose:
 *
 * - Ensure DELETE /econDiscuss/member/topics/{topicId}/subscribe rejects when no
 *   Authorization header is present.
 *
 * Steps:
 *
 * 1. Register an admin (admin.join) so we can create a topic.
 * 2. Create a topic via admin endpoint and capture its id.
 * 3. Create an unauthenticated connection (headers: {}) and attempt to unsubscribe
 *    from the topic using the member endpoint.
 * 4. Assert that the unauthenticated attempt throws an error (do not assert
 *    specific status codes).
 */
export async function test_api_topic_unsubscription_unauthenticated_401(
  connection: api.IConnection,
) {
  // 1) Admin join to obtain admin auth (SDK sets Authorization automatically)
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Passw0rd!", // >= 8 chars
      display_name: RandomGenerator.name(1),
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2) Create a topic (admin scope)
  const topic = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: `t-${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(topic);

  // 3) Prepare an unauthenticated connection (NEVER manipulate existing headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4) Attempt member unsubscribe without auth → expect error (no status assertion)
  await TestValidator.error(
    "unauthenticated unsubscribe must be rejected",
    async () => {
      await api.functional.econDiscuss.member.topics.subscribe.erase(
        unauthConn,
        { topicId: topic.id },
      );
    },
  );
}
