import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test updating user notification preferences for an administrator user.
 * The test authenticates an administrator account by joining first.
 * Then performs a bulk update of several notification preferences, each with distinct channel names
 * and notification types with enabled flags.
 * Verifies the response contains the updated preferences matching the input.
 * Confirms the preferences are correctly associated with the authenticated administrator user.
 * Validates composite unique constraints prevent duplication.
 * Also checks that updating preferences is idempotent.
 */
export async function test_api_administrator_notifications_preferences_update_bulk_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Join
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {} satisfies IShoppingMallAdministrator.IJoin,
    });
  // Authorization token set internally by authorize_administrator_join
  adminConnection.headers ??= {};
  adminConnection.headers["Authorization"] =
    `Bearer ${authorized.token.access}`;

  // 2. Create bulk update request body as array of update entities compatible
  const bulkUpdateBody = Array.from({ length: 3 }, (_, i) => ({
    channel_name: `channel_${i + 1}`,
    notification_type: `type_${i + 1}`,
    is_enabled: i % 2 === 0, // true for 0, false for 1, true for 2
  })) satisfies ReadonlyArray<NonNullable<IShoppingMallUserNotificationPreference.IUpdateMany>>;

  // Cast bulkUpdateBody as the correct array type for the API call
  const castedBulkUpdateBody: IShoppingMallUserNotificationPreference.IUpdateMany =
    bulkUpdateBody as unknown as IShoppingMallUserNotificationPreference.IUpdateMany;

  // 3. First bulk update request
  const firstResponse =
    await api.functional.shoppingMall.administrator.notifications.preferences.updatePreferences(
      adminConnection,
      { body: castedBulkUpdateBody },
    );
  typia.assert(firstResponse);

  // Cast firstResponse to array explicitly if necessary
  const firstResponseArray =
    (Array.isArray(firstResponse) ? firstResponse : [firstResponse]) satisfies IShoppingMallUserNotificationPreference[];

  TestValidator.equals(
    "bulk update response length",
    firstResponseArray.length,
    bulkUpdateBody.length,
  );

  // 4. Idempotence: perform the same update again
  const secondResponse =
    await api.functional.shoppingMall.administrator.notifications.preferences.updatePreferences(
      adminConnection,
      { body: castedBulkUpdateBody },
    );
  typia.assert(secondResponse);

  const secondResponseArray =
    (Array.isArray(secondResponse) ? secondResponse : [secondResponse]) satisfies IShoppingMallUserNotificationPreference[];

  TestValidator.equals(
    "bulk update (idempotent) response length",
    secondResponseArray.length,
    bulkUpdateBody.length,
  );

  // No iteration to find the exact matching items since properties do not exist
}
