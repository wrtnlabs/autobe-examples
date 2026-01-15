import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerBillingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBillingAddress";
import type { IShoppingMallSellerDashboardSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboardSettings";
import type { IShoppingMallSellerOnboardingProgress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingProgress";
import type { IShoppingMallSellerPayoutSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutSettings";
import type { IShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceMetrics";
import type { IShoppingMallSellerSocialMediaHandles } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSocialMediaHandles";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_dashboard_settings_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account via join
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const sellerJoined = await authorize_member_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      business_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      createdAt: new Date().toISOString(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoined);
  // Step 2: Create authenticated connection for the seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(sellerConnection, {
    body: {
      email: sellerJoined.email,
      password,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Step 3: Retrieve current dashboard settings for verification
  const currentSettings =
    await api.functional.shoppingMall.seller.sellers.dashboard_settings.putBySellerid(
      sellerConnection,
      {
        sellerId: sellerJoined.id,
        body: {},
      },
    );
  typia.assert(currentSettings);
  // Step 4: Define partial update with only notification_level and metrics_visibility
  const partialUpdate: IShoppingMallSellerDashboardSettings.IUpdate = {
    notification_level: "high",
    metrics_visibility: ["sales_total", "orders_count"],
  };
  // Step 5: Perform partial update
  const updatedSettings =
    await api.functional.shoppingMall.seller.sellers.dashboard_settings.putBySellerid(
      sellerConnection,
      {
        sellerId: sellerJoined.id,
        body: partialUpdate,
      },
    );
  typia.assert(updatedSettings);
  // Step 6: Validate that only the specified fields were updated and others unchanged
  TestValidator.equals(
    "notification_level updated",
    updatedSettings.notification_level,
    "high",
  );
  TestValidator.equals(
    "metrics_visibility updated",
    updatedSettings.metrics_visibility,
    ["sales_total", "orders_count"],
  );
  // Verify unchanged fields retain original values
  TestValidator.equals(
    "default_date_range unchanged",
    updatedSettings.default_date_range,
    currentSettings.default_date_range,
  );
  TestValidator.equals(
    "widget_order unchanged",
    updatedSettings.widget_order,
    currentSettings.widget_order,
  );
  TestValidator.equals(
    "auto_refresh_enabled unchanged",
    updatedSettings.auto_refresh_enabled,
    currentSettings.auto_refresh_enabled,
  );
  TestValidator.equals(
    "timezone unchanged",
    updatedSettings.timezone,
    currentSettings.timezone,
  );
  TestValidator.equals(
    "language unchanged",
    updatedSettings.language,
    currentSettings.language,
  );
  TestValidator.equals(
    "email_notifications_enabled unchanged",
    updatedSettings.email_notifications_enabled,
    currentSettings.email_notifications_enabled,
  );
  TestValidator.equals(
    "sms_notifications_enabled unchanged",
    updatedSettings.sms_notifications_enabled,
    currentSettings.sms_notifications_enabled,
  );
  TestValidator.equals(
    "dashboard_view unchanged",
    updatedSettings.dashboard_view,
    currentSettings.dashboard_view,
  );
}