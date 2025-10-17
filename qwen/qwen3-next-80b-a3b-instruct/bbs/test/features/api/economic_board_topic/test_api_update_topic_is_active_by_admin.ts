import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_update_topic_is_active_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin with complex password
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string =
    RandomGenerator.alphaNumeric(6) +
    RandomGenerator.alphabets(4).toUpperCase() +
    RandomGenerator.alphaNumeric(2) +
    "!@#";
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new topic with is_active: true using random valid topic name
  const validTopicNames = [
    "Inflation",
    "Tax Policy",
    "Elections",
    "Global Trade",
    "Monetary Policy",
    "Labor Markets",
    "Fiscal Policy",
  ] as const;
  const topicName: IEconomicBoardTopic.ICreate["name"] =
    RandomGenerator.pick(validTopicNames);
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
        description: "Discussion about inflation rates and economic impacts",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);
  TestValidator.equals(
    "topic should be initially active",
    topic.is_active,
    true,
  );

  // 3. Deactivate the topic (is_active: false)
  const deactivation: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.update(connection, {
      topicId: topic.id,
      body: {
        is_active: false,
      } satisfies IEconomicBoardTopic.IUpdate,
    });
  typia.assert(deactivation);
  TestValidator.equals(
    "topic should be deactivated",
    deactivation.is_active,
    false,
  );
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(deactivation.updated_at) > new Date(topic.created_at),
  );

  // 4. Reactivate the topic (is_active: true)
  const reactivation: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.update(connection, {
      topicId: topic.id,
      body: {
        is_active: true,
      } satisfies IEconomicBoardTopic.IUpdate,
    });
  typia.assert(reactivation);
  TestValidator.equals(
    "topic should be reactivated",
    reactivation.is_active,
    true,
  );
  TestValidator.predicate(
    "updated_at should be newer than deactivation timestamp",
    new Date(reactivation.updated_at) > new Date(deactivation.updated_at),
  );

  // 5. Validate that the topic's core data (id, name) remains unchanged
  TestValidator.equals("topic ID unchanged", reactivation.id, topic.id);
  TestValidator.equals("topic name unchanged", reactivation.name, topic.name);

  // 6. Ensure description remains unchanged
  TestValidator.equals(
    "topic description unchanged",
    reactivation.description,
    topic.description,
  );
}
