import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentNotification";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_notification_status_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join" as const,
    referrer: "https://example.com/admin/signup" as const,
  };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCreds },
  );
  typia.assert(admin);
  // Step 2: Create update data for a payment notification with status from pending to success
  // Note: We must have an existing notification with the ID. Since we cannot create notifications, we generate a random ID
  // that matches the required format and use it in the update.
  const paymentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const existingNotificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const updateData: IShoppingMallPaymentNotification.IUpdate = {
    id: existingNotificationId,
    type: "payment_pending",
    message: "Payment processing is currently underway.",
    payment_id: paymentId,
    created_at: new Date().toISOString(),
    status: "success",
  } satisfies IShoppingMallPaymentNotification.IUpdate;
  // Step 3: Update notification status from pending to success using admin connection
  const updatedNotification: IShoppingMallPaymentNotification =
    await api.functional.shoppingMall.admin.payment_notifications.update(
      adminConnection,
      {
        notificationId: existingNotificationId,
        body: updateData,
      },
    );
  typia.assert(updatedNotification);
  // Step 4: Verify status transition and data preservation
  TestValidator.equals(
    "status transitioned from pending to success",
    updatedNotification.status,
    "success",
  );
  TestValidator.equals(
    "message preserved",
    updatedNotification.message,
    updateData.message,
  );
  TestValidator.equals(
    "payment_id preserved",
    updatedNotification.payment_id,
    updateData.payment_id,
  );
  TestValidator.predicate(
    "updated_at changed from original",
    () => updatedNotification.updated_at > updateData.created_at,
  );
}
