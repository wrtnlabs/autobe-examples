import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_topic_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin to gain access to topic operations
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a topic to retrieve
  const topicToRetrieve: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
        description: "A comprehensive overview of economic inflation dynamics",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topicToRetrieve);

  // 3. Retrieve the created topic by its ID
  const retrievedTopic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.at(connection, {
      topicId: topicToRetrieve.id,
    });
  typia.assert(retrievedTopic);

  // 4. Validate the retrieved topic's properties match the original
  TestValidator.equals(
    "topic ID matches",
    retrievedTopic.id,
    topicToRetrieve.id,
  );
  TestValidator.equals(
    "topic name matches",
    retrievedTopic.name,
    topicToRetrieve.name,
  );
  TestValidator.equals(
    "topic description matches",
    retrievedTopic.description,
    topicToRetrieve.description,
  );
  TestValidator.equals(
    "topic is active",
    retrievedTopic.is_active,
    topicToRetrieve.is_active,
  );
  TestValidator.predicate("created_at is ISO datetime", () => {
    return !isNaN(new Date(retrievedTopic.created_at).getTime());
  });
  TestValidator.predicate("updated_at is ISO datetime", () => {
    return !isNaN(new Date(retrievedTopic.updated_at).getTime());
  });
}
