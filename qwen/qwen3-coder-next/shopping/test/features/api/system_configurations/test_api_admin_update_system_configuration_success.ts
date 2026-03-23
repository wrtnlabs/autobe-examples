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

export async function test_api_admin_update_system_configuration_success(
  connection: api.IConnection,
): Promise<void> {
  // Admin authentication to access configuration endpoints
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  // Generate a random configuration ID to test the update endpoint
  const configurationId = typia.random<string & tags.Format<"uuid">>();
  // Update the configuration with new values
  const updated =
    await api.functional.ecommerceMall.admin.system_configurations.update(
      adminConnection,
      {
        configurationId,
        body: {
          key: "payment_gateway",
          value: JSON.stringify({ enabled: true, provider: "paypal" }),
          description: "Updated to use PayPal",
        } satisfies IEcommerceMallSystemConfiguration.IUpdate,
      },
    );
  typia.assert(updated);
  // Verify the update returned a valid configuration
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f-]{36}$/i.test(updated.id),
  );
  TestValidator.equals("key matches", updated.key, "payment_gateway");
  TestValidator.equals(
    "value updated",
    updated.value,
    JSON.stringify({ enabled: true, provider: "paypal" }),
  );
  TestValidator.equals(
    "description updated",
    updated.description,
    "Updated to use PayPal",
  );
  TestValidator.predicate("has updated_at", updated.updated_at !== undefined);
  TestValidator.predicate("has created_at", updated.created_at !== undefined);
}
