import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_setting_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Since no utility function exists, use direct SDK function call
  // Use a valid UUID string for id
  const validId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve system setting by id
  const result = await api.functional.shoppingMall.systemSettings.at(
    connection,
    {
      id: validId,
    },
  );
  // Assert complete runtime type validation
  typia.assert(result);
  // Validate business logic: the 'result' object should contain expected fields
  // but since IShoppingMallSystemSetting is empty type here, just trust typia.assert
  // No further validation possible
}
