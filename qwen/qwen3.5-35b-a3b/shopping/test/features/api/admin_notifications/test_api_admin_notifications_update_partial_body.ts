import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_notifications_create } from "../../../generate/generate_random_ecommerce_mall_admin_notifications_create";
import { prepare_random_ecommerce_mall_notification } from "../../../prepare/prepare_random_ecommerce_mall_notification";

export async function test_api_admin_notifications_update_partial_body(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and get authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminResponse);
  const adminTokenConnection: api.IConnection = { host: connection.host };
  adminTokenConnection.headers = {
    Authorization: adminResponse.token.access,
  };
  // 2. Create initial notification with specific title, body, and type
  const initialTitle = "System Update Notice";
  const initialBody = "Initial content";
  const notificationType = "system_alert" as const;
  const initialNotification =
    await generate_random_ecommerce_mall_admin_notifications_create(
      adminTokenConnection,
      {
        body: {
          title: initialTitle,
          body: initialBody,
          type: notificationType,
          recipients: [
            {
              title: initialTitle,
              body: initialBody,
              type: notificationType,
              recipients: [
                {
                  recipient_type: "admin",
                  recipient_id: adminResponse.id,
                },
              ],
            },
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(initialNotification);
  const initialCreatedAt = initialNotification.created_at;
  // 3. Update only the body field without providing title in request
  const updatedBody = "New notification content with more details";
  const updateResponse =
    await api.functional.ecommerceMall.admin.notifications.update(
      adminTokenConnection,
      {
        notificationId: initialNotification.id,
        body: {
          body: updatedBody,
        } satisfies IEcommerceMallNotification.IUpdate,
      },
    );
  typia.assert(updateResponse);
  // 4. Validate only body changed, other fields preserved
  TestValidator.equals(
    "body should be updated to new value",
    updateResponse.body,
    updatedBody,
  );
  TestValidator.equals(
    "title should remain unchanged from initial value",
    updateResponse.title,
    initialTitle,
  );
  TestValidator.equals(
    "type should remain unchanged",
    updateResponse.type,
    notificationType,
  );
  TestValidator.equals(
    "status should remain unchanged as unread",
    updateResponse.status,
    "unread",
  );
  // 5. Validate updated_at timestamp was refreshed (greater than created_at)
  const updatedAtTime = new Date(updateResponse.updated_at).getTime();
  const createdAtTime = new Date(initialCreatedAt).getTime();
  TestValidator.predicate(
    "updated_at should be greater than created_at",
    updatedAtTime > createdAtTime,
  );
}