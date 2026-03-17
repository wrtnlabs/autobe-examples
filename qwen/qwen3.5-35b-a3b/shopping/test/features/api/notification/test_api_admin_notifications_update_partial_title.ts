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

export async function test_api_admin_notifications_update_partial_title(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Create notification with specific values using utility
  const initialTitle = "Original Title";
  const initialBody = "Original Body Content";
  const initialType = "platform_announcement";
  const originalNotification =
    await generate_random_ecommerce_mall_admin_notifications_create(
      adminConnection,
      {
        body: {
          title: initialTitle,
          body: initialBody,
          type: initialType,
        },
      },
    );
  typia.assert(originalNotification);
  // 3. Update only title field (partial update)
  const updatedTitle = "Updated Title";
  const updatedNotification =
    await api.functional.ecommerceMall.admin.notifications.update(
      adminConnection,
      {
        notificationId: originalNotification.id,
        body: {
          title: updatedTitle,
        } satisfies IEcommerceMallNotification.IUpdate,
      },
    );
  typia.assert(updatedNotification);
  // 4. Validate partial update - only title changed
  TestValidator.equals(
    "title updated",
    updatedNotification.title,
    updatedTitle,
  );
  TestValidator.equals("body unchanged", updatedNotification.body, initialBody);
  TestValidator.equals("type unchanged", updatedNotification.type, initialType);
  TestValidator.equals(
    "status unchanged",
    updatedNotification.status,
    "unread",
  );
  // 5. Validate updated_at is refreshed
  const createdDate = new Date(originalNotification.created_at);
  const updatedDate = new Date(updatedNotification.updated_at);
  TestValidator.predicate("updated_at refreshed", updatedDate > createdDate);
}
