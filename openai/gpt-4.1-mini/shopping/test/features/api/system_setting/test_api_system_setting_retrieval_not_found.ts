import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_setting_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID to simulate a missing system setting ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Use a separate connection as required by the CRITICAL guideline
  const customConnection: api.IConnection = { host: connection.host };
  // Call the API endpoint expecting an HttpError due to not found
  await TestValidator.httpError(
    "system setting retrieval not found",
    404,
    async () => {
      await api.functional.shoppingMall.systemSettings.at(customConnection, {
        id: nonExistentId,
      });
    },
  );
}
