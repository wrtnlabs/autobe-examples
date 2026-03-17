import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_notification_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create initial notification using random data (mock for this test)
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  const createdNotification = {
    id: notificationId,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    type: "platform_announcement",
    status: "unread",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IEcommerceMallNotification;
  // 3. Update notification with new title and body
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newBody = RandomGenerator.content({ paragraphs: 3 });
  const beforeUpdateTimestamp = new Date(createdNotification.updated_at);
  const updatedNotification =
    await api.functional.ecommerceMall.superAdmin.notifications.update(
      superAdminConnection,
      {
        notificationId,
        body: {
          title: newTitle,
          body: newBody,
        } satisfies IEcommerceMallNotification.IUpdate,
      },
    );
  typia.assert(updatedNotification);
  // 4. Validate update response
  TestValidator.equals("title updated", updatedNotification.title, newTitle);
  TestValidator.equals("body updated", updatedNotification.body, newBody);
  TestValidator.equals("id preserved", updatedNotification.id, notificationId);
  TestValidator.equals(
    "type preserved",
    updatedNotification.type,
    "platform_announcement",
  );
  TestValidator.equals(
    "status preserved",
    updatedNotification.status,
    "unread",
  );
  // Validate updated_at timestamp was updated
  TestValidator.predicate(
    "updated_at timestamp changed",
    new Date(updatedNotification.updated_at) > beforeUpdateTimestamp,
  );
  // Validate date-time format
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(new Date(updatedNotification.updated_at).getTime()),
  );
  TestValidator.predicate(
    "created_at remains unchanged",
    updatedNotification.created_at === createdNotification.created_at,
  );
  // Validate soft-deletion status
  TestValidator.equals(
    "notification not soft-deleted",
    updatedNotification.deleted_at,
    null,
  );
}
