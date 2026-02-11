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

export async function test_api_system_config_retrieval_by_key(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminUser);
  // Step 2: Retrieve a system configuration
  // Using a known valid config key that exists in the system
  const configKey = "site_name";
  const config = await api.functional.redditPlatform.admin.system_configs.at(
    adminConnection,
    {
      configKey: configKey,
    },
  );
  typia.assert(config);
  // Step 3: Validate response structure
  TestValidator.equals("config_key matches", config.config_key, configKey);
  TestValidator.predicate(
    "config_value is string",
    typeof config.config_value === "string",
  );
  TestValidator.predicate(
    "config_type is string",
    typeof config.config_type === "string",
  );
  TestValidator.predicate(
    "is_active is boolean",
    typeof config.is_active === "boolean",
  );
  TestValidator.predicate(
    "created_at is date-time string",
    typeof config.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is date-time string",
    typeof config.updated_at === "string",
  );
}
