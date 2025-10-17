import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussTopicSubscriptionSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussTopicSubscriptionSortBy";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";
import type { IEconDiscussUserTopicSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserTopicSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussTopic";

/**
 * List my topic subscriptions with filters and verify unsubscribe exclusion.
 *
 * Business context:
 *
 * - Admin curates topics first. A Member account then subscribes to those topics.
 * - The member can list active subscriptions with pagination and optional text
 *   filter.
 * - Unsubscribing removes the topic from the member’s active subscription list.
 * - Subscribe/Unsubscribe operations are idempotent (repeating is safe).
 * - Authentication boundary: unauthenticated listing must fail.
 *
 * Steps:
 *
 * 1. Admin joins and creates two curated topics: Macro and Labor
 * 2. Member joins and subscribes to both topics; repeat one subscribe to assert
 *    idempotency
 * 3. PATCH /econDiscuss/member/me/topics with page=1, pageSize=20 → both topics
 *    must appear
 * 4. Unauthenticated boundary: same PATCH without Authorization must throw
 * 5. Apply filter q="mac" → only Macro should be present, Labor absent
 * 6. Unsubscribe Labor → list again to ensure Labor no longer appears; erase again
 *    to assert idempotency
 */
export async function test_api_topic_subscriptions_list_with_filters_and_unsubscribe(
  connection: api.IConnection,
) {
  // 1) Admin joins and creates two curated topics
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Password!1",
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(admin);

  const macroTopic = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: `macro-${RandomGenerator.alphaNumeric(8)}`,
        name: "Macro",
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(macroTopic);

  const laborTopic = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: `labor-${RandomGenerator.alphaNumeric(8)}`,
        name: "Labor",
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(laborTopic);

  // 2) Member joins and subscribes to both topics
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "Password!1",
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  await api.functional.econDiscuss.member.topics.subscribe.create(connection, {
    topicId: macroTopic.id,
  });
  await api.functional.econDiscuss.member.topics.subscribe.create(connection, {
    topicId: laborTopic.id,
  });
  // Idempotency: repeat subscribe on Macro — should be safe (no error)
  await api.functional.econDiscuss.member.topics.subscribe.create(connection, {
    topicId: macroTopic.id,
  });

  // 3) List my subscriptions → expect both topics
  const page1 = await api.functional.econDiscuss.member.me.topics.search(
    connection,
    {
      body: {
        page: 1,
        pageSize: 20,
      } satisfies IEconDiscussUserTopicSubscription.IRequest,
    },
  );
  typia.assert(page1);
  const ids1 = page1.data.map((d) => d.id);
  TestValidator.predicate(
    "listing includes both subscribed topics",
    ids1.includes(macroTopic.id) && ids1.includes(laborTopic.id),
  );

  // 4) Auth boundary: unauthenticated listing must throw (no status code assertion)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot list subscriptions",
    async () => {
      await api.functional.econDiscuss.member.me.topics.search(unauthConn, {
        body: {
          page: 1,
          pageSize: 20,
        } satisfies IEconDiscussUserTopicSubscription.IRequest,
      });
    },
  );

  // 5) Filter q="mac" → Macro present, Labor absent
  const filtered = await api.functional.econDiscuss.member.me.topics.search(
    connection,
    {
      body: {
        page: 1,
        pageSize: 20,
        q: "mac",
      } satisfies IEconDiscussUserTopicSubscription.IRequest,
    },
  );
  typia.assert(filtered);
  const filteredIds = filtered.data.map((d) => d.id);
  TestValidator.predicate(
    "filtered listing includes Macro and excludes Labor",
    filteredIds.includes(macroTopic.id) && !filteredIds.includes(laborTopic.id),
  );

  // 6) Unsubscribe Labor and confirm exclusion; erase again for idempotency
  await api.functional.econDiscuss.member.topics.subscribe.erase(connection, {
    topicId: laborTopic.id,
  });
  const afterUnsub = await api.functional.econDiscuss.member.me.topics.search(
    connection,
    {
      body: {
        page: 1,
        pageSize: 20,
      } satisfies IEconDiscussUserTopicSubscription.IRequest,
    },
  );
  typia.assert(afterUnsub);
  const idsAfter = afterUnsub.data.map((d) => d.id);
  TestValidator.predicate(
    "after unsubscribe, Labor is absent and Macro remains",
    !idsAfter.includes(laborTopic.id) && idsAfter.includes(macroTopic.id),
  );

  // Idempotency: unsubscribe again — should not throw
  await api.functional.econDiscuss.member.topics.subscribe.erase(connection, {
    topicId: laborTopic.id,
  });
}
