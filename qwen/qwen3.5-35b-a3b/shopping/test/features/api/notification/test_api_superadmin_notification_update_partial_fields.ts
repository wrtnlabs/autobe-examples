import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_admin_notifications_create } from "../../../generate/generate_random_ecommerce_mall_admin_notifications_create";
import { prepare_random_ecommerce_mall_notification } from "../../../prepare/prepare_random_ecommerce_mall_notification";

export async function test_api_superadmin_notification_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin setup - join and login
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(12);
  const superAdminJoin = await authorize_super_admin_join(
    superAdminJoinConnection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(superAdminJoin);
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_login(
    superAdminLoginConnection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Admin setup for creating notification
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminJoin);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminAuth);
  // 3. Create initial notification with admin
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialBody = RandomGenerator.paragraph({ sentences: 4 });
  const notification =
    await api.functional.ecommerceMall.admin.notifications.create(
      adminLoginConnection,
      {
        body: prepare_random_ecommerce_mall_notification({
          title: initialTitle,
          body: initialBody,
          type: "platform_announcement",
        }),
      },
    );
  typia.assert(notification);
  const createdAt = notification.created_at;
  const initialUpdatedAt = notification.updated_at;
  // 4. Partial update - only title
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedNotification1 =
    await api.functional.ecommerceMall.superAdmin.notifications.update(
      superAdminLoginConnection,
      {
        notificationId: notification.id,
        body: {
          title: newTitle,
        } satisfies IEcommerceMallNotification.IUpdate,
      },
    );
  typia.assert(updatedNotification1);
  // 5. Validate partial update (title only)
  TestValidator.equals("title updated", updatedNotification1.title, newTitle);
  TestValidator.equals(
    "body unchanged",
    updatedNotification1.body,
    initialBody,
  );
  TestValidator.equals(
    "type unchanged",
    updatedNotification1.type,
    "platform_announcement",
  );
  TestValidator.equals(
    "status unchanged",
    updatedNotification1.status,
    "unread",
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedNotification1.created_at,
    createdAt,
  );
  TestValidator.predicate(
    "updated_at refreshed",
    updatedNotification1.updated_at !== initialUpdatedAt,
  );
  // 6. Partial update - only body
  const newBody = RandomGenerator.paragraph({ sentences: 4 });
  const updatedNotification2 =
    await api.functional.ecommerceMall.superAdmin.notifications.update(
      superAdminLoginConnection,
      {
        notificationId: notification.id,
        body: {
          body: newBody,
        } satisfies IEcommerceMallNotification.IUpdate,
      },
    );
  typia.assert(updatedNotification2);
  // 7. Validate partial update (body only)
  TestValidator.equals(
    "title unchanged after body update",
    updatedNotification2.title,
    newTitle,
  );
  TestValidator.equals("body updated", updatedNotification2.body, newBody);
  TestValidator.predicate(
    "updated_at refreshed again",
    updatedNotification2.updated_at !== updatedNotification1.updated_at,
  );
  // 8. Verify all fields present in response
  TestValidator.equals("id present", updatedNotification2.id.length > 0, true);
  TestValidator.equals(
    "title present",
    updatedNotification2.title.length > 0,
    true,
  );
  TestValidator.equals(
    "body present",
    updatedNotification2.body.length > 0,
    true,
  );
  TestValidator.equals(
    "type present",
    updatedNotification2.type.length > 0,
    true,
  );
  TestValidator.equals(
    "status present",
    updatedNotification2.status.length > 0,
    true,
  );
  TestValidator.equals(
    "created_at present",
    updatedNotification2.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "updated_at present",
    updatedNotification2.updated_at.length > 0,
    true,
  );
  TestValidator.equals(
    "deleted_at null",
    updatedNotification2.deleted_at,
    null,
  );
}
