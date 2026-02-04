import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_configuration_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Prepare configuration update with valid values
  // Note: created_at and updated_at are system-managed read-only fields
  // According to API spec, they should not be included in update requests
  const updatedConfig: IShoppingMallConfiguration = {
    currency: "USD", // Valid ISO 4217 3-character currency code
    timezone: "Asia/Seoul", // Valid IANA timezone identifier
    locale: "ko-KR", // Valid BCP 47 locale format
    payment_gateway: "stripe", // Valid payment gateway option
    tax_calculation: "standard", // Valid tax calculation method
    shipping_rate_strategy: "flat", // Valid shipping rate strategy
    feature_toggles: {
      allow_seller_registration: true,
      require_email_verification: true,
      enable_product_reviews: true,
      auto_approve_sellers: false,
      allow_guest_checkout: false,
      use_dynamic_pricing: false,
      enable_live_chat: true,
      allow_bulk_product_import: true,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallConfiguration;
  // Step 3: Call the API endpoint with admin connection
  const result: IShoppingMallConfiguration =
    await api.functional.shoppingMall.admin.configurations.patch(
      adminConnection, // ✅ Use adminConnection, NOT base connection
      {
        body: updatedConfig,
      },
    );
  typia.assert(result);
  // Step 4: Validate all updated configuration values
  TestValidator.equals("currency updated", result.currency, "USD");
  TestValidator.equals("timezone updated", result.timezone, "Asia/Seoul");
  TestValidator.equals("locale updated", result.locale, "ko-KR");
  TestValidator.equals(
    "payment_gateway updated",
    result.payment_gateway,
    "stripe",
  );
  TestValidator.equals(
    "tax_calculation updated",
    result.tax_calculation,
    "standard",
  );
  TestValidator.equals(
    "shipping_rate_strategy updated",
    result.shipping_rate_strategy,
    "flat",
  );
  TestValidator.equals(
    "allow_seller_registration updated",
    result.feature_toggles.allow_seller_registration,
    true,
  );
  TestValidator.equals(
    "require_email_verification updated",
    result.feature_toggles.require_email_verification,
    true,
  );
  TestValidator.equals(
    "enable_product_reviews updated",
    result.feature_toggles.enable_product_reviews,
    true,
  );
  TestValidator.equals(
    "auto_approve_sellers updated",
    result.feature_toggles.auto_approve_sellers,
    false,
  );
  TestValidator.equals(
    "allow_guest_checkout updated",
    result.feature_toggles.allow_guest_checkout,
    false,
  );
  TestValidator.equals(
    "use_dynamic_pricing updated",
    result.feature_toggles.use_dynamic_pricing,
    false,
  );
  TestValidator.equals(
    "enable_live_chat updated",
    result.feature_toggles.enable_live_chat,
    true,
  );
  TestValidator.equals(
    "allow_bulk_product_import updated",
    result.feature_toggles.allow_bulk_product_import,
    true,
  );
  // Note: created_at and updated_at are system-managed fields that will be updated by the server
  // We validate they are in ISO 8601 date-time format using typia.assert()
}
