import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
export async function test_api_configuration_retrieval_by_key(
  connection: api.IConnection,
): Promise<void> {
  // Use a configuration key that is guaranteed to exist in the test system based on schema documentation
  // According to the IDiscussionBoardConfiguration schema examples, 'max_comments_per_post' is a standard key
  const configKey = "max_comments_per_post";
  // Retrieve the configuration by key
  const actualConfig: IDiscussionBoardConfiguration =
    await api.functional.discussionBoard.configurations.at(connection, {
      configKey,
    });
  // Validate the response structure and types with typia.assert (performs COMPLETE validation)
  typia.assert(actualConfig);
  // Verify that the returned key matches the requested key (case-sensitive)
  TestValidator.equals(
    "returned key matches requested key",
    actualConfig.key,
    configKey,
  );
  // Verify that value is a string (as per schema)
  TestValidator.predicate(
    "value is string",
    typeof actualConfig.value === "string",
  );
  // Verify that description is a string
  TestValidator.predicate(
    "description is string",
    typeof actualConfig.description === "string",
  );
  // Verify that createdAt is a date-time string (typia.assert already validates format)
  TestValidator.predicate(
    "createdAt is string",
    typeof actualConfig.createdAt === "string",
  );
  // Verify that createdBy is a string (typia.assert validates UUID format)
  TestValidator.predicate(
    "createdBy is string",
    typeof actualConfig.createdBy === "string",
  );
  // Verify that updatedBy is a string (typia.assert validates UUID format)
  TestValidator.predicate(
    "updatedBy is string",
    typeof actualConfig.updatedBy === "string",
  );
}
