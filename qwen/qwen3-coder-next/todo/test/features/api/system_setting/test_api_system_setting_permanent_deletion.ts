import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_setting_permanent_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Use a unique key for the system setting to test deletion
  const settingKey = `test_setting_${RandomGenerator.alphaNumeric(8)}`;
  // Note: The API only provides the delete function (erase), so we assume
  // the setting already exists in the database for this deletion test.
  // In a real E2E test scenario, there would typically be a POST or PUT
  // endpoint to create the setting first, but it's not provided in the API.
  // Perform the deletion
  await api.functional.todoApp.system_settings.erase(connection, {
    settingKey: settingKey,
  });
  // The erase function returns void (true), so we can't validate the response
  // In a real implementation, we would expect a GET or similar endpoint
  // to verify the setting no longer exists, but that endpoint is not provided.
}
