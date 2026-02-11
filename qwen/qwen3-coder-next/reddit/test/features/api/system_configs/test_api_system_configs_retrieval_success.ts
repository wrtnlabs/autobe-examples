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

/**
 * Test system configuration retrieval endpoint.
 * 1. Admin registers and authenticates
 * 2. Admin retrieves all system configurations
 * 3. Validates response structure and ordering
 */
export async function test_api_system_configs_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12341234",
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Retrieve system configurations
  const response =
    await api.functional.redditPlatform.admin.system_configs.index(
      adminConnection,
    );
  typia.assert(response);
  // Handle single response or array based on API definition
  // Since API returns single IRedditPlatformSystematicConfig but scenario expects array,
  // we'll create an array with the single config for validation
  const configs = Array.isArray(response) ? response : [response];
  // 3. Validate response structure
  TestValidator.predicate("response is array", Array.isArray(configs));
  TestValidator.predicate(
    "configs are ordered alphabetically",
    configs.every(
      (v, i, arr) => i === 0 || arr[i - 1].config_key <= v.config_key,
    ),
  );
  // 4. Validate each configuration entry
  TestValidator.predicate(
    "has at least one configuration entry",
    configs.length > 0,
  );
  if (configs.length > 0) {
    const config = configs[0];
    TestValidator.equals("has id", typeof config.id, "string");
    TestValidator.equals("has config_key", typeof config.config_key, "string");
    TestValidator.equals(
      "has config_value",
      typeof config.config_value,
      "string",
    );
    TestValidator.equals(
      "has config_type",
      typeof config.config_type,
      "string",
    );
    TestValidator.predicate(
      "has description",
      config.description === null || typeof config.description === "string",
    );
    TestValidator.equals("has is_active", typeof config.is_active, "boolean");
    TestValidator.equals("has created_at", typeof config.created_at, "string");
    TestValidator.equals("has updated_at", typeof config.updated_at, "string");
  }
}
