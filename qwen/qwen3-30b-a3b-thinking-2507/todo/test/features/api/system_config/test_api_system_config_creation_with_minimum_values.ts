import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoSystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_todo_system_configs_create } from "../../../generate/generate_random_todo_system_configs_create";
import { prepare_random_todo_system_config } from "../../../prepare/prepare_random_todo_system_config";

export async function test_api_system_config_creation_with_minimum_values(
  connection: api.IConnection,
): Promise<void> {
  const systemConfig = await generate_random_todo_system_configs_create(
    connection,
    {
      body: {
        email_verification_timeout: 1,
        password_reset_timeout: 1,
        feature_flags: JSON.stringify({ feature1: true }),
      } satisfies ITodoSystemConfig.ICreate,
    },
  );
  typia.assert(systemConfig);
}
