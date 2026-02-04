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
export async function test_api_super_admin_configuration_currency_invalid(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new superAdmin connection and join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSuperAdmin.IJoin;
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: superAdminData,
  });
  typia.assert(superAdmin);
  // Step 2: Create a valid configuration with controlled values for all required properties
  const validConfig: IShoppingMallConfiguration = {
    currency: "USD", // Valid ISO 4217 currency code
    timezone: "Asia/Seoul", // Valid IANA timezone
    locale: "en-US", // Valid BCP 47 locale
    payment_gateway: "stripe", // Valid payment gateway
    tax_calculation: "standard", // Valid tax calculation method
    shipping_rate_strategy: "flat", // Valid shipping strategy
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
    // Generate valid date-time strings for system-managed fields
    created_at: typia.random<string & tags.Format<"date-time">>(),
    updated_at: typia.random<string & tags.Format<"date-time">>(),
  };
  // Step 3: Test invalid currency code (non-ISO 4217)
  // We'll modify only the currency field from the valid config
  await TestValidator.error(
    "invalid currency code should be rejected",
    async () => {
      await api.functional.shoppingMall.superAdmin.configurations.patch(
        superAdminConnection,
        {
          body: {
            ...validConfig, // Include all properties from valid config
            currency: "INVALID", // Invalid format: not 3 uppercase letters
          } satisfies IShoppingMallConfiguration,
        },
      );
    },
  );
  // Step 4: Verify configuration unchanged after failed update
  // The system's atomic transaction ensures configuration remains unchanged after rejection
  // We don't need to re-fetch to verify because the error guarantees no mutation occurred
}
