import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_configuration_retrieval_by_key(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  // Test: Retrieve existing configuration by known key
  const configKey = "payment_gateway";
  const config =
    await api.functional.ecommerceMall.admin.system_configurations.at(
      adminConnection,
      {
        configurationKey: configKey,
      },
    );
  typia.assert(config);
  // Validate required fields
  TestValidator.equals("config key matches", config.key, configKey);
  TestValidator.predicate("has valid JSON value", () => {
    try {
      JSON.parse(config.value);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate(
    "created_at is valid ISO string",
    () => !isNaN(Date.parse(config.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    () => !isNaN(Date.parse(config.updated_at)),
  );
  // Validate timestamp constraints
  TestValidator.predicate(
    "created_at <= updated_at",
    () =>
      new Date(config.created_at).getTime() <=
      new Date(config.updated_at).getTime(),
  );
  // Validate deleted_at is null for active config
  TestValidator.equals(
    "deleted_at is null for active config",
    config.deleted_at,
    null,
  );
}
