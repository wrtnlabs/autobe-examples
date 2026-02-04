import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_super_admin_configuration_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // Step 2: Define valid configuration changes
  const updatedConfig: IShoppingMallConfiguration = {
    currency: "USD" satisfies string & tags.Pattern<"^[A-Z]{3}$">,
    timezone: "America/New_York" satisfies string &
      tags.Pattern<"^[A-Za-z]+/[A-Za-z_]+$">,
    locale: "en-US" satisfies string & tags.Pattern<"^[a-z]{2}-[A-Z]{2}$">,
    payment_gateway: "stripe" satisfies
      | "stripe"
      | "paypal"
      | "razorpay"
      | "square",
    tax_calculation: "standard" satisfies "standard" | "reverse" | "exempt",
    shipping_rate_strategy: "tiered" satisfies
      | "flat"
      | "weight_based"
      | "free_threshold"
      | "tiered",
    feature_toggles: {
      allow_seller_registration: true,
      require_email_verification: true,
      enable_product_reviews: true,
      auto_approve_sellers: false,
      allow_guest_checkout: true,
      use_dynamic_pricing: false,
      enable_live_chat: true,
      allow_bulk_product_import: true,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallConfiguration;
  // Step 3: Update configuration with the new values
  const result: IShoppingMallConfiguration =
    await api.functional.shoppingMall.superAdmin.configurations.patch(
      superAdminConnection, // Use superAdminConnection, not base connection
      {
        body: updatedConfig,
      },
    );
  // Step 4: Validate the response matches exactly what was sent
  typia.assert(result);
  TestValidator.equals(
    "currency updated successfully",
    result.currency,
    updatedConfig.currency,
  );
  TestValidator.equals(
    "timezone updated successfully",
    result.timezone,
    updatedConfig.timezone,
  );
  TestValidator.equals(
    "locale updated successfully",
    result.locale,
    updatedConfig.locale,
  );
  TestValidator.equals(
    "payment_gateway updated successfully",
    result.payment_gateway,
    updatedConfig.payment_gateway,
  );
  TestValidator.equals(
    "tax_calculation updated successfully",
    result.tax_calculation,
    updatedConfig.tax_calculation,
  );
  TestValidator.equals(
    "shipping_rate_strategy updated successfully",
    result.shipping_rate_strategy,
    updatedConfig.shipping_rate_strategy,
  );
  TestValidator.equals(
    "feature_toggles updated successfully",
    result.feature_toggles,
    updatedConfig.feature_toggles,
  );
  // Do NOT validate created_at - it should remain unchanged
  // Validate updated_at was modified
  TestValidator.notEquals(
    "updated_at changed after configuration update",
    result.updated_at,
    updatedConfig.updated_at,
  );
}
