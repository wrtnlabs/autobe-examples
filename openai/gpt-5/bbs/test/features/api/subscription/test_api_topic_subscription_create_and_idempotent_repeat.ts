import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussTopic";

export async function test_api_topic_subscription_create_and_idempotent_repeat(
  connection: api.IConnection,
) {
  /**
   * Validate member topic subscription creation and idempotent repeat behavior.
   *
   * Steps:
   *
   * 1. Admin joins and creates an active topic
   * 2. Member joins (authenticated context is set by SDK)
   * 3. Member subscribes to the topic (no error, void response)
   * 4. Verify the topic is listed in member subscriptions
   * 5. Repeat subscribe call to confirm idempotency (no error)
   * 6. Verify no duplicate entries exist in the subscription listing
   */
  // 1) Admin: join and authenticate
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
      // avatar_uri: optional
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2) Admin: create a curated topic
  const topicBody = {
    code: `sub-${RandomGenerator.alphaNumeric(12)}`,
    name: `Topic ${RandomGenerator.paragraph({ sentences: 2 })}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussTopic.ICreate;
  const topic = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: topicBody,
    },
  );
  typia.assert(topic);

  // 3) Member: join and authenticate
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberJoin);

  // 4) Member: subscribe to the topic (void response, success by no error)
  await api.functional.econDiscuss.member.topics.subscribe.create(connection, {
    topicId: topic.id,
  });

  // Verify appears in member subscriptions
  const page1 =
    await api.functional.econDiscuss.member.me.topics.index(connection);
  typia.assert(page1);
  const found1 = page1.data.find((t) => t.id === topic.id);
  TestValidator.predicate(
    "after first subscribe, topic appears in my topics",
    found1 !== undefined,
  );

  // 5) Repeat subscribe: idempotent (no error)
  await api.functional.econDiscuss.member.topics.subscribe.create(connection, {
    topicId: topic.id,
  });

  // 6) Verify no duplicate exists after repeat subscribe
  const page2 =
    await api.functional.econDiscuss.member.me.topics.index(connection);
  typia.assert(page2);
  const occurrences = page2.data.filter((t) => t.id === topic.id).length;
  TestValidator.equals(
    "idempotent repeat does not create duplicate subscriptions",
    occurrences,
    1,
  );
}
