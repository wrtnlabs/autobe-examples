import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_settings_update(
  connection: api.IConnection,
): Promise<void> {
  // Generate random setting key and value
  const settingKey = RandomGenerator.alphaNumeric(10);
  const newValue = RandomGenerator.paragraph({ sentences: 2 });
  // Update the system setting
  const result = await api.functional.todoApp.system_settings.update(
    connection,
    {
      settingKey: settingKey,
      body: {
        value: newValue,
      } satisfies ITodoAppSystemSetting.IUpdate,
    },
  );
  typia.assert(result);
}
