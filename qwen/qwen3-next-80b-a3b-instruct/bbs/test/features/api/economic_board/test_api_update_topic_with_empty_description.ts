import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_update_topic_with_empty_description(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminEmail: string = typia.random<string>();
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePass123!",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new topic with description
  const topicName: "Inflation" = "Inflation";
  const createdTopic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
        description: "This is a sample description for testing",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(createdTopic);

  // 3. Update the topic's description to empty string
  const updatedTopic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.update(connection, {
      topicId: createdTopic.id,
      body: {
        description: "",
      } satisfies IEconomicBoardTopic.IUpdate,
    });
  typia.assert(updatedTopic);

  // 4. Validate that the description is empty and updated_at was updated
  TestValidator.equals(
    "topic description should be empty",
    updatedTopic.description,
    "",
  );
  TestValidator.notEquals(
    "updated_at should be different from created_at",
    updatedTopic.updated_at,
    createdTopic.created_at,
  );
  TestValidator.equals(
    "topic name should remain unchanged",
    updatedTopic.name,
    createdTopic.name,
  );
  TestValidator.equals(
    "topic is_active should remain unchanged",
    updatedTopic.is_active,
    createdTopic.is_active,
  );
}
