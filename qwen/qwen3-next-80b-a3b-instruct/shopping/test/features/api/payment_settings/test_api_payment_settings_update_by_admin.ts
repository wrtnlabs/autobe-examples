import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettings";
import type { IShoppingMallPaymentSettingsCurrencyConversionSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsCurrencyConversionSettings";
import type { IShoppingMallPaymentSettingsGatewayFailoverPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsGatewayFailoverPriority";
import type { IShoppingMallPaymentSettingsRegionRestrictions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsRegionRestrictions";
import type { IShoppingMallPaymentSettingsSecuritySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsSecuritySettings";
import type { IShoppingMallPaymentSettingsSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsSurchargeRule";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_settings_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Generate unique settingId using UUID format
  const settingId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create valid payment settings update payload
  const paymentSettingsUpdate: IShoppingMallPaymentSettings.IUpdate = {
    enabled_payment_methods: ["credit_card", "digital_wallet"],
    name: "Primary Payment Processor - E2E Test",
    currency_conversion_settings: "", // Correct: string type as per DTO definition, not an object
    region_restrictions: "", // Correct: string type as per DTO definition, not an object
    gateway_failover_priorities: [
      {
        gateway_id: typia.random<string & tags.Format<"uuid">>(),
        priority: 1,
        failure_threshold: 0.1,
        fallback_gateway: null,
      },
      {
        gateway_id: typia.random<string & tags.Format<"uuid">>(),
        priority: 2,
        failure_threshold: 0.15,
        fallback_gateway: typia.random<string & tags.Format<"uuid">>(),
      },
    ],
    security_settings: {
      fraud_detection_threshold: 75,
      max_retry_attempts: 3,
      max_amount_per_minute: 500000,
      use_3d_secure: true,
    },
  } satisfies IShoppingMallPaymentSettings.IUpdate;
  // Step 4: Execute payment settings update using admin connection
  const updatedSettings =
    await api.functional.shoppingMall.admin.payment_settings.update(
      adminConnection,
      {
        settingId,
        body: paymentSettingsUpdate,
      },
    );
  // Step 5: Validate response structure and types
  typia.assert(updatedSettings);
  // Step 6: Verify key properties were updated correctly
  // Cast updatedSettings to the IUpdate type since it's the expected return type after update
  const updatedSettingsTyped = updatedSettings as IShoppingMallPaymentSettings.IUpdate;
  TestValidator.equals(
    "payment methods updated",
    updatedSettingsTyped.enabled_payment_methods,
    paymentSettingsUpdate.enabled_payment_methods,
  );
  TestValidator.equals(
    "name updated",
    updatedSettingsTyped.name,
    paymentSettingsUpdate.name,
  );
  TestValidator.equals(
    "security settings updated",
    updatedSettingsTyped.security_settings?.use_3d_secure,
    paymentSettingsUpdate.security_settings?.use_3d_secure,
  );
}