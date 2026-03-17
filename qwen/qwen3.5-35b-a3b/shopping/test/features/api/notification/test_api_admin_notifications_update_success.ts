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

export async function test_api_admin_notifications_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://test.example.com/admin/join",
      referrer: "http://test.example.com",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create initial notification using utility function
  const initialNotification =
    await generate_random_ecommerce_mall_admin_notifications_create(
      adminConnection,
      {
        body: {
          recipients: [
            {
              title: "Initial Title",
              body: "Initial Body Content",
              type: "platform_announcement",
              recipients: [
                {
                  recipient_type: "admin",
                  recipient_id: admin.id,
                },
              ],
            },
          ],
        },
      },
    );
  typia.assert(initialNotification);
  const originalTitle = initialNotification.title;
  const originalBody = initialNotification.body;
  const originalType = initialNotification.type;
  const originalStatus = initialNotification.status;
  const originalCreatedAt = initialNotification.created_at;
  const originalDeletedAt = initialNotification.deleted_at;
  // 3. Update notification with new title and body
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const newBody = RandomGenerator.content({ paragraphs: 3 });
  const updatedNotification =
    await api.functional.ecommerceMall.admin.notifications.update(
      adminConnection,
      {
        notificationId: initialNotification.id,
        body: {
          title: newTitle,
          body: newBody,
        } satisfies IEcommerceMallNotification.IUpdate,
      },
    );
  typia.assert(updatedNotification);
  // 4. Validate update success
  TestValidator.equals(
    "title updated correctly",
    updatedNotification.title,
    newTitle,
  );
  TestValidator.equals(
    "body updated correctly",
    updatedNotification.body,
    newBody,
  );
  // 5. Validate unchanged fields
  TestValidator.equals(
    "id remains unchanged",
    updatedNotification.id,
    initialNotification.id,
  );
  TestValidator.equals(
    "type remains unchanged",
    updatedNotification.type,
    originalType,
  );
  TestValidator.equals(
    "status remains unchanged",
    updatedNotification.status,
    originalStatus,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedNotification.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "deleted_at remains unchanged",
    updatedNotification.deleted_at,
    originalDeletedAt,
  );
  // 6. Validate updated_at timestamp is refreshed
  const updatedAtTimestamp = new Date(updatedNotification.updated_at).getTime();
  const createdAtTimestamp = new Date(initialNotification.created_at).getTime();
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedAtTimestamp > createdAtTimestamp,
  );
}
