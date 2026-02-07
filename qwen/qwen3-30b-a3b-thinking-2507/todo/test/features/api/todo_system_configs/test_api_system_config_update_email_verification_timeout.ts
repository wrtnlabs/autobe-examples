import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoSystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_config_update_email_verification_timeout(
  connection: api.IConnection,
): Promise<void> {
  const configId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    email_verification_timeout: 30,
  } satisfies ITodoSystemConfig.IUpdate;
  const updatedConfig = await api.functional.todo.system_configs.update(
    connection,
    {
      configId,
      body,
    },
  );
  typia.assert(updatedConfig);
  TestValidator.equals(
    "email_verification_timeout should be updated to 30",
    updatedConfig.email_verification_timeout,
    30,
  );
}
