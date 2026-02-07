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

export async function test_api_system_config_creation_with_maximum_values(
  connection: api.IConnection,
): Promise<void> {
  const output = await generate_random_todo_system_configs_create(connection, {
    body: {
      email_verification_timeout: 1440,
      password_reset_timeout: 1440,
      feature_flags: "",
    },
  });
  typia.assert(output);
  TestValidator.equals(
    "email_verification_timeout matches",
    output.email_verification_timeout,
    1440,
  );
  TestValidator.equals(
    "password_reset_timeout matches",
    output.password_reset_timeout,
    1440,
  );
  TestValidator.equals("feature_flags empty", output.feature_flags, "");
  TestValidator.notEquals("created_at set", output.created_at, null);
  TestValidator.notEquals("updated_at set", output.updated_at, null);
}
