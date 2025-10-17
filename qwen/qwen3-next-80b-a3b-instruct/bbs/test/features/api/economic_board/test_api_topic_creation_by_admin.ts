import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_topic_creation_by_admin(
  connection: api.IConnection,
) {
  // Authenticate as admin
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: "admin@economicboard.gov",
        password: "SecurePass123!",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Create a new economic topic
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Tax Policy",
        description: "Regulatory framework for income taxation and deductions",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Validate business logic: topic name and description match expected values
  TestValidator.equals(
    "created topic name should match requested value",
    topic.name,
    "Tax Policy",
  );
  TestValidator.equals(
    "created topic description should match requested value",
    topic.description,
    "Regulatory framework for income taxation and deductions",
  );
}
