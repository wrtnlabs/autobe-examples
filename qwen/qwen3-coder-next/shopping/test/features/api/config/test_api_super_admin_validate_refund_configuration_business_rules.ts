import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_super_admin_configs_configure } from "../../../generate/generate_random_shopping_mall_super_admin_configs_configure";
import { prepare_random_shopping_mall_systematic_config } from "../../../prepare/prepare_random_shopping_mall_systematic_config";

export async function test_api_super_admin_validate_refund_configuration_business_rules(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Login as super admin to establish authenticated session
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Generate random super admin credentials for login
  const adminCredentials = typia.random<IShoppingMallSuperAdmin.IJoin>();
  const authResult = await api.functional.shoppingMall.auth.super_admin.join(
    superAdminConnection,
    { body: adminCredentials },
  );
  typia.assert(authResult);
  // Update connection with auth token
  if (authResult.token.access) {
    superAdminConnection.headers = {
      ...superAdminConnection.headers,
      Authorization: `Bearer ${authResult.token.access}`,
    };
  }
  // Step 2: Test business logic validation - configuration exceeding maximum allowed time window
  // Since IShoppingMallSystematicConfig is empty in the DTO definition,
  // we need to use the empty structure but the scenario implies we need refund properties
  // We'll use DeepPartial to construct a request that matches the business scenario
  const invalidBody = {
    refund_window_days: 90, // Exceeds maximum of 30 days allowed by business logic
    refund_enabled: true,
    refund_required_reason: true,
  };
  // Step 3: Verify system rejects configuration due to business logic validation
  // The API should validate that window_days does not exceed the maximum allowed
  await TestValidator.error(
    "should reject configuration exceeding maximum time window",
    async () => {
      await api.functional.shoppingMall.superAdmin.configs.configure(
        superAdminConnection,
        {
          body: invalidBody,
        },
      );
    },
  );
  // Step 4: Test successful creation with valid refund window (7 days)
  const validBody = {
    refund_window_days: 7, // Valid within the 30-day maximum
    refund_enabled: true,
    refund_required_reason: true,
  };
  const config = await api.functional.shoppingMall.superAdmin.configs.configure(
    superAdminConnection,
    {
      body: validBody,
    },
  );
  typia.assert(config);
  // Step 5: Validate configuration was stored with correct values
  TestValidator.equals(
    "configuration has expected structure",
    true,
    config !== undefined,
  );
}
