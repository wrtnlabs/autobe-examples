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
 * List my topic subscriptions with default pagination and active-only
 * filtering.
 *
 * Business context:
 *
 * - Admin creates curated topics available for subscription.
 * - A member subscribes to multiple topics; repeated subscribe calls are
 *   idempotent.
 * - When a subscription is removed (unsubscribe), it must not appear in the list.
 * - The GET endpoint returns only the caller's active subscriptions as topic
 *   summaries with pagination metadata.
 *
 * Steps:
 *
 * 1. Admin joins and creates three topics (A, B, C) with unique codes.
 * 2. Member joins and subscribes to A and B, re-subscribes to A to verify
 *    idempotency, then unsubscribes B.
 * 3. Unauthenticated negative check: GET should error without auth (no status
 *    assertion).
 * 4. Authenticated GET: verify that A appears, B and C do not; ensure uniqueness
 *    and basic pagination invariants.
 */
export async function test_api_topic_subscriptions_my_list_default_pagination(
  connection: api.IConnection,
) {
  // 1) Admin joins (auth) and creates topics
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "P@ssw0rd!123",
    display_name: RandomGenerator.name(),
    // Optional preferences can be omitted
  } satisfies IEconDiscussAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // Create three curated topics
  const topicBodies = [
    {
      code: `macro_${RandomGenerator.alphaNumeric(10)}`,
      name: `Macro ${RandomGenerator.name(1)}`,
      description: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies IEconDiscussTopic.ICreate,
    {
      code: `labor_${RandomGenerator.alphaNumeric(10)}`,
      name: `Labor ${RandomGenerator.name(1)}`,
      description: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies IEconDiscussTopic.ICreate,
    {
      code: `finance_${RandomGenerator.alphaNumeric(10)}`,
      name: `Finance ${RandomGenerator.name(1)}`,
      description: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies IEconDiscussTopic.ICreate,
  ];

  const createdTopics = new Array<IEconDiscussTopic>();
  for (const body of topicBodies) {
    const topic = await api.functional.econDiscuss.admin.topics.create(
      connection,
      { body },
    );
    typia.assert(topic);
    createdTopics.push(topic);
  }
  const [topicA, topicB, topicC] = createdTopics;

  // 2) Member joins (auth) and manages subscriptions
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    email: memberEmail,
    password: "P@ssw0rd!123",
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(memberAuth);

  // Subscribe to A and B
  await api.functional.econDiscuss.member.topics.subscribe.create(connection, {
    topicId: topicA.id,
  });
  await api.functional.econDiscuss.member.topics.subscribe.create(connection, {
    topicId: topicB.id,
  });
  // Re-subscribe to A to verify idempotency (should be a no-op)
  await api.functional.econDiscuss.member.topics.subscribe.create(connection, {
    topicId: topicA.id,
  });
  // Unsubscribe from B so it should not appear in the list
  await api.functional.econDiscuss.member.topics.subscribe.erase(connection, {
    topicId: topicB.id,
  });

  // 3) Negative: unauthenticated cannot list subscriptions
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot list my topic subscriptions",
    async () => {
      await api.functional.econDiscuss.member.me.topics.index(unauthConn);
    },
  );

  // 4) Authenticated GET: list my topics
  const page =
    await api.functional.econDiscuss.member.me.topics.index(connection);
  typia.assert(page);

  // Validate inclusion/exclusion and uniqueness
  const returnedIds = new Set(page.data.map((s) => s.id));
  TestValidator.predicate(
    "still-subscribed topic A appears in my list",
    returnedIds.has(topicA.id),
  );
  TestValidator.predicate(
    "unsubscribed topic B does not appear in my list",
    returnedIds.has(topicB.id) === false,
  );
  TestValidator.predicate(
    "never-subscribed topic C does not appear in my list",
    returnedIds.has(topicC.id) === false,
  );

  // Ensure no duplicates in results
  TestValidator.equals(
    "no duplicate topics in results",
    page.data.length,
    returnedIds.size,
  );

  // Basic pagination invariants
  const p = page.pagination;
  TestValidator.predicate(
    "pagination.records >= data.length",
    p.records >= page.data.length,
  );
  TestValidator.predicate(
    "pagination fields are non-negative (current, limit, pages, records)",
    p.current >= 0 && p.limit >= 0 && p.pages >= 0 && p.records >= 0,
  );
}
