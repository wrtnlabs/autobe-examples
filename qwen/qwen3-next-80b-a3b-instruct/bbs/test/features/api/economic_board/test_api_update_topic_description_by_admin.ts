import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_update_topic_description_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPassword123!";
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create a new topic
  const topicName: IEconomicBoardTopic.ICreate["name"] = "Inflation";
  const initialDescription: string = RandomGenerator.paragraph({
    sentences: 5,
  });
  const createdTopic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
        description: initialDescription,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(createdTopic);
  TestValidator.equals("topic name matches", createdTopic.name, topicName);
  TestValidator.equals(
    "initial description matches",
    createdTopic.description,
    initialDescription,
  );

  // Step 3: Update the topic description
  const updatedDescription: string = RandomGenerator.paragraph({
    sentences: 4,
  });
  const updatedTopic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.update(connection, {
      topicId: createdTopic.id,
      body: {
        description: updatedDescription,
      } satisfies IEconomicBoardTopic.IUpdate,
    });
  typia.assert(updatedTopic);

  // Step 4: Validate update results
  TestValidator.equals("topic name unchanged", updatedTopic.name, topicName);
  TestValidator.equals(
    "description updated",
    updatedTopic.description,
    updatedDescription,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedTopic.updated_at) > new Date(createdTopic.created_at),
  );
}
