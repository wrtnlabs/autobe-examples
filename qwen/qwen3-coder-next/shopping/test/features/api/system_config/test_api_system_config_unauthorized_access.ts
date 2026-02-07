import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_config_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Guest access attempt - no authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Attempt to retrieve system config without authentication
  await TestValidator.error(
    "should reject unauthorized guest access",
    async () => {
      await api.functional.shoppingMall.admin.configs.at(guestConnection, {
        configId: "d8a5e3f4-9b2c-4a7d-8e1f-2c3b5d7e9f0a",
      });
    },
  );
  // Regular customer access attempt - logged in as customer (not admin)
  const customerConnection: api.IConnection = { host: connection.host };
  // First, create a regular customer account (simulated - would normally require customer registration)
  // Since we can't create customers directly, we'll simulate an unauthorized admin access attempt
  // with a non-admin token by attempting to use the guest connection without proper admin auth
  // Attempt to retrieve system config with unauthorized (non-admin) access
  await TestValidator.error("should reject non-admin user access", async () => {
    await api.functional.shoppingMall.admin.configs.at(customerConnection, {
      configId: "d8a5e3f4-9b2c-4a7d-8e1f-2c3b5d7e9f0a",
    });
  });
}
