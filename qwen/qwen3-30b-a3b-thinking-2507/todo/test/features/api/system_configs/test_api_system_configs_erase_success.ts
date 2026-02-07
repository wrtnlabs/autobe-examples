import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_configs_erase_success(
  connection: api.IConnection,
): Promise<void> {
  const configId = typia.random<string & tags.Format<"uuid">>();
  const output = await api.functional.todo.system_configs.erase(connection, {
    configId,
  });
  typia.assert(output);
}
