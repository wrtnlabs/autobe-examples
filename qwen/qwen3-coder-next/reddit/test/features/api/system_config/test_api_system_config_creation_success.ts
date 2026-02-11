import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSystematicConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_reddit_platform_admin_system_configs_create } from "../../../generate/generate_random_reddit_platform_admin_system_configs_create";
import { prepare_random_reddit_platform_systematic_config } from "../../../prepare/prepare_random_reddit_platform_systematic_config";

export async function test_api_system_config_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: "12345678",
      username: `admin_${RandomGenerator.alphabets(6)}`,
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Login as admin
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: "12345678",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 3. Create system configuration with various config_type values
  const configTypes = ["string", "int", "double", "boolean", "json"] as const;
  for (const configType of configTypes) {
    const body = {
      config_key: `test_config_${configType}_${RandomGenerator.alphabets(4)}`,
      config_value:
        configType === "boolean"
          ? "true"
          : configType === "int"
            ? "123"
            : configType === "double"
              ? "123.45"
              : configType === "json"
                ? '{"key":"value"}'
                : "test_value",
      config_type: configType,
      description: `Test ${configType} configuration`,
      is_active: true,
    } satisfies IRedditPlatformSystematicConfig.ICreate;
    // 4. Create configuration and validate response
    const created =
      await api.functional.redditPlatform.admin.system_configs.create(
        adminConnection,
        { body },
      );
    typia.assert(created);
    // 5. Verify created configuration matches submitted data
    TestValidator.equals(
      "config_key matches",
      created.config_key,
      body.config_key,
    );
    TestValidator.equals(
      "config_value matches",
      created.config_value,
      body.config_value,
    );
    TestValidator.equals(
      "config_type matches",
      created.config_type,
      body.config_type,
    );
    TestValidator.equals(
      "description matches",
      created.description,
      body.description,
    );
    TestValidator.equals(
      "is_active matches",
      created.is_active,
      body.is_active,
    );
    TestValidator.predicate(
      "has valid id",
      /^[0-9a-f-]{36}$/i.test(created.id),
    );
    TestValidator.predicate(
      "has valid created_at",
      /^[0-9T:.Z-]+$/i.test(created.created_at),
    );
    TestValidator.predicate(
      "has valid updated_at",
      /^[0-9T:.Z-]+$/i.test(created.updated_at),
    );
  }
}
