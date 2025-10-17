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

/**
 * Unsubscribe from a topic and ensure DELETE is idempotent.
 *
 * This E2E test validates the topic unsubscription flow for a member and the
 * idempotency of the DELETE /econDiscuss/member/topics/{topicId}/subscribe
 * endpoint.
 *
 * Steps
 *
 * 1. Admin joins and creates a topic.
 * 2. Member joins and subscribes to that topic.
 * 3. (Sanity) Verify subscription appears in the member's topic list.
 * 4. Member calls DELETE to unsubscribe and expects success (204 by contract).
 * 5. Verify the topic is no longer listed in the member's subscriptions.
 * 6. Repeat DELETE to confirm idempotency (still succeeds, no error).
 * 7. Verify the topic remains absent from the member's subscriptions.
 */
export async function test_api_topic_unsubscription_idempotent_delete_existing(
  connection: api.IConnection,
) {
  // 1) Admin joins (Authorization will be set by SDK)
  const adminAuth: IEconDiscussAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssw0rd1234",
        display_name: RandomGenerator.name(2),
        timezone: "Asia/Seoul",
        locale: "en-US",
      } satisfies IEconDiscussAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2) Admin creates a topic
  const topic: IEconDiscussTopic =
    await api.functional.econDiscuss.admin.topics.create(connection, {
      body: {
        code: `topic-${RandomGenerator.alphaNumeric(10)}`,
        name: `Topic ${RandomGenerator.name(1)}`,
        description: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussTopic.ICreate,
    });
  typia.assert(topic);

  // 3) Member joins (Authorization switches to member by SDK)
  const memberAuth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssw0rd1234",
        display_name: RandomGenerator.name(2),
        timezone: "Asia/Seoul",
        locale: "en-US",
      } satisfies IEconDiscussMember.ICreate,
    });
  typia.assert(memberAuth);

  // 4) Member subscribes to the topic (204 No Content expected on success)
  await api.functional.econDiscuss.member.topics.subscribe.create(connection, {
    topicId: topic.id,
  });

  // Optional sanity check: verify the topic appears in subscriptions
  const before: IPageIEconDiscussTopic.ISummary =
    await api.functional.econDiscuss.member.me.topics.index(connection);
  typia.assert(before);
  const foundBefore: boolean = before.data.some((t) => t.id === topic.id);
  TestValidator.predicate("subscription appears after subscribe", foundBefore);

  // 5) Unsubscribe (DELETE) and verify the topic is removed
  await api.functional.econDiscuss.member.topics.subscribe.erase(connection, {
    topicId: topic.id,
  });

  const afterFirstDelete: IPageIEconDiscussTopic.ISummary =
    await api.functional.econDiscuss.member.me.topics.index(connection);
  typia.assert(afterFirstDelete);
  const foundAfterFirst: boolean = afterFirstDelete.data.some(
    (t) => t.id === topic.id,
  );
  TestValidator.predicate(
    "topic removed from subscriptions after first DELETE",
    foundAfterFirst === false,
  );

  // 6) Repeat DELETE (idempotent)
  await api.functional.econDiscuss.member.topics.subscribe.erase(connection, {
    topicId: topic.id,
  });

  const afterSecondDelete: IPageIEconDiscussTopic.ISummary =
    await api.functional.econDiscuss.member.me.topics.index(connection);
  typia.assert(afterSecondDelete);
  const foundAfterSecond: boolean = afterSecondDelete.data.some(
    (t) => t.id === topic.id,
  );
  TestValidator.predicate(
    "repeat DELETE is idempotent and topic remains absent",
    foundAfterSecond === false,
  );
}
