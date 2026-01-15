import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
export async function test_api_discussion_board_configuration_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate random filter parameters using typia.random for valid IRequest schema
  const filters: IDiscussionBoardConfiguration.IRequest =
    typia.random<IDiscussionBoardConfiguration.IRequest>() as IDiscussionBoardConfiguration.IRequest;
  // Call API with generated filters
  const configuration: IDiscussionBoardConfiguration =
    await api.functional.discussionBoard.configurations.index(connection, {
      body: filters,
    });
  // Validate response structure and type safety with typia.assert
  typia.assert(configuration);
  // Validate required fields exist and have correct types
  TestValidator.equals("config has key", typeof configuration.key, "string");
  TestValidator.equals(
    "config has value",
    typeof configuration.value,
    "string",
  );
  TestValidator.equals(
    "config has description",
    typeof configuration.description,
    "string",
  );
  TestValidator.equals(
    "config has createdBy",
    typeof configuration.createdBy,
    "string",
  );
  TestValidator.equals(
    "config has updatedBy",
    typeof configuration.updatedBy,
    "string",
  );
}
