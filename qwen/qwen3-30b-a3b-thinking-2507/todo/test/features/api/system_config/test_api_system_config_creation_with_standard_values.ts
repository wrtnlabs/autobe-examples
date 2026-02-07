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

export async function test_api_system_config_creation_with_standard_values(
  connection: api.IConnection,
) {
  const systemConfig = await generate_random_todo_system_configs_create(
    connection,
    {
      body: {
        email_verification_timeout: 15,
        password_reset_timeout: 60,
        feature_flags: '{"feature1": true, "feature2": false}',
      },
    },
  );
  typia.assert(systemConfig);
  TestValidator.equals(
    "email verification timeout",
    systemConfig.email_verification_timeout,
    15,
  );
  TestValidator.equals(
    "password reset timeout",
    systemConfig.password_reset_timeout,
    60,
  );
  TestValidator.equals(
    "feature flags match",
    systemConfig.feature_flags,
    '{"feature1": true, "feature2": false}',
  );
  TestValidator.predicate("created_at is populated", !!systemConfig.created_at);
  TestValidator.predicate("updated_at is populated", !!systemConfig.updated_at);
  TestValidator.equals("deleted_at is null", systemConfig.deleted_at, null);
}
