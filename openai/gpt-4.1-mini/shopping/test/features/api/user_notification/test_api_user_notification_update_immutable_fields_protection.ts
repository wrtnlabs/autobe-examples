import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_user_notifications_create_user_notification } from "../../../generate/generate_random_shopping_mall_administrator_user_notifications_create_user_notification";
import { prepare_random_shopping_mall_user_notification } from "../../../prepare/prepare_random_shopping_mall_user_notification";

export async function test_api_user_notification_update_immutable_fields_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and setup authentication connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinInput,
  });
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Create user notification to update
  const originalNotification =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      { body: {} },
    );
  typia.assert(originalNotification);
  // 3. Prepare updated data with changes to mutable fields
  const updatedAt = new Date().toISOString();
  const updatePayload: IShoppingMallUserNotification.IUpdate = {
    title: originalNotification.title + " updated",
    body: originalNotification.body + " updated",
    url: originalNotification.url ?? null,
    imageUrl: originalNotification.image_url ?? null,
    isRead: !originalNotification.is_read,
    deliveredAt:
      originalNotification.delivered_at === null ||
      originalNotification.delivered_at === undefined
        ? new Date().toISOString()
        : null,
    readAt:
      originalNotification.read_at === null ||
      originalNotification.read_at === undefined
        ? new Date().toISOString()
        : null,
    updatedAt: updatedAt,
  };
  // 4. Perform update
  const updatedNotification =
    await api.functional.shoppingMall.administrator.userNotifications.update(
      adminConnection,
      {
        notificationId: originalNotification.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedNotification);
  // 5. Validate that immutable fields are unchanged
  TestValidator.equals(
    "id remains unchanged",
    updatedNotification.id,
    originalNotification.id,
  );
  TestValidator.equals(
    "notificationTemplateId remains unchanged",
    updatedNotification.notification_template_id,
    originalNotification.notification_template_id,
  );
  TestValidator.equals(
    "ownerId remains unchanged",
    updatedNotification.owner_id,
    originalNotification.owner_id,
  );
  TestValidator.equals(
    "ownerType remains unchanged",
    updatedNotification.owner_type,
    originalNotification.owner_type,
  );
  // 6. Validate deletesAt (soft delete) remains unchanged after update
  TestValidator.equals(
    "deletedAt remains unchanged",
    updatedNotification.deleted_at ?? null,
    originalNotification.deleted_at ?? null,
  );
  // 7. Validate changed mutable fields
  TestValidator.equals(
    "title updated",
    updatedNotification.title,
    updatePayload.title,
  );
  TestValidator.equals(
    "body updated",
    updatedNotification.body,
    updatePayload.body,
  );
  TestValidator.equals(
    "url updated",
    updatedNotification.url ?? null,
    updatePayload.url,
  );
  TestValidator.equals(
    "imageUrl updated",
    updatedNotification.image_url ?? null,
    updatePayload.imageUrl,
  );
  TestValidator.equals(
    "isRead updated",
    updatedNotification.is_read,
    updatePayload.isRead,
  );
  // 8. Validate deliveredAt and readAt handling
  TestValidator.equals(
    "deliveredAt equals updated or null",
    updatedNotification.delivered_at ?? null,
    updatePayload.deliveredAt ?? null,
  );
  TestValidator.equals(
    "readAt equals updated or null",
    updatedNotification.read_at ?? null,
    updatePayload.readAt ?? null,
  );
  // 9. Attempt further update with values trying to clear deletedAt (should remain unchanged)
  const clearedDeletedAtUpdate: IShoppingMallUserNotification.IUpdate = {
    ...updatePayload,
    updatedAt: new Date(new Date(updatedAt).getTime() + 1000).toISOString(),
    // deletedAt is immutable, cannot be cleared via API
  };
  const reupdateNotification =
    await api.functional.shoppingMall.administrator.userNotifications.update(
      adminConnection,
      {
        notificationId: originalNotification.id,
        body: clearedDeletedAtUpdate,
      },
    );
  typia.assert(reupdateNotification);
  // deletedAt should remain unchanged
  TestValidator.equals(
    "deletedAt remains unchanged after second update",
    reupdateNotification.deleted_at ?? null,
    originalNotification.deleted_at ?? null,
  );
  // 10. Because IUpdate DTO does not include immutable fields (id, notificationTemplateId, ownerId, ownerType, deletedAt),
  // direct update attempts to these fields via API are impossible and thus not tested here.
}
