import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

/**
 * Attempt to subscribe to an archived topic should fail.
 *
 * Steps
 *
 * 1. Admin joins (auth) and creates a topic.
 * 2. Admin archives the topic (soft delete).
 * 3. Member joins (auth).
 * 4. Member attempts to subscribe to the archived topic and receives an error
 *    (business rule).
 *
 * Notes
 *
 * - Authentication tokens are handled by the SDK join endpoints.
 * - We only assert that an error occurs (not specific status codes).
 * - Typia.assert() is applied to non-void responses only.
 */
export async function test_api_topic_subscription_archived_topic_not_found(
  connection: api.IConnection,
) {
  // 1) Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
    // avatar_uri optional
  } satisfies IEconDiscussAdmin.ICreate;
  const adminAuth: IEconDiscussAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // Admin creates a topic
  const createTopicBody = {
    code: `econ-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussTopic.ICreate;
  const topic: IEconDiscussTopic =
    await api.functional.econDiscuss.admin.topics.create(connection, {
      body: createTopicBody,
    });
  typia.assert(topic);

  // 2) Admin archives the topic (soft delete)
  await api.functional.econDiscuss.admin.topics.erase(connection, {
    topicId: topic.id,
  });

  // 3) Member joins
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const memberAuth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(memberAuth);

  // 4) Member attempts to subscribe to an archived topic → should error
  await TestValidator.error(
    "subscribing to an archived topic must fail",
    async () => {
      await api.functional.econDiscuss.member.topics.subscribe.create(
        connection,
        { topicId: topic.id },
      );
    },
  );
}
