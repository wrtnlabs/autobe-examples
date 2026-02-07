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

export async function test_api_system_config_get_valid(
  connection: api.IConnection,
): Promise<void> {
  // Create system configuration
  const config = await generate_random_todo_system_configs_create(connection, {
    body: {
      email_verification_timeout: 15,
      password_reset_timeout: 60,
      feature_flags: '{"feature1":true}',
    },
  });
  typia.assert(config);
  // Verify fields
  TestValidator.equals(
    "email_verification_timeout",
    config.email_verification_timeout,
    15,
  );
  TestValidator.equals(
    "password_reset_timeout",
    config.password_reset_timeout,
    60,
  );
  TestValidator.equals(
    "feature_flags",
    config.feature_flags,
    '{"feature1":true}',
  );
  TestValidator.equals("deleted_at", config.deleted_at, null);
}
