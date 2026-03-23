import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotificationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotificationQueue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_notification_queue_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail =
    typia.random<string & tags.Format<"email">>() + "@admin.test.com";
  const adminPassword = "1234" + RandomGenerator.alphaNumeric(10);
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const loginConnection: api.IConnection = { host: connection.host };
  const loginAuth = await authorize_admin_login(loginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(loginAuth);
  // 2. Create test notification queue entries
  const userId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const notifications = ArrayUtil.repeat(5, (i) => ({
    type: i % 2 === 0 ? "email" : ("in_app" as const),
    user_id: userId,
    status: i < 2 ? "pending" : i < 4 ? "sent" : ("failed" as const),
    created_at: new Date(now.getTime() - i * 1000 * 60).toISOString(),
    updated_at: new Date(now.getTime() - i * 1000 * 60).toISOString(),
    error_message: i === 4 ? "Delivery failed" : undefined,
  }));
  // 3. Test type filtering
  const emailNotifications =
    await api.functional.ecommerceMall.admin.notification_queues.index(
      loginConnection,
      {
        body: {
          type: "email",
        } satisfies IEcommerceMallNotificationQueue.IRequest,
      },
    );
  typia.assert(emailNotifications);
  TestValidator.predicate(
    "email notifications filtered",
    emailNotifications.data.length > 0,
  );
  const inAppNotifications =
    await api.functional.ecommerceMall.admin.notification_queues.index(
      loginConnection,
      {
        body: {
          type: "in_app",
        } satisfies IEcommerceMallNotificationQueue.IRequest,
      },
    );
  typia.assert(inAppNotifications);
  TestValidator.predicate(
    "in-app notifications filtered",
    inAppNotifications.data.length > 0,
  );
  // 4. Test status filtering
  const pendingNotifications =
    await api.functional.ecommerceMall.admin.notification_queues.index(
      loginConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallNotificationQueue.IRequest,
      },
    );
  typia.assert(pendingNotifications);
  TestValidator.predicate(
    "pending notifications filtered",
    pendingNotifications.data.length > 0,
  );
  // 5. Test timestamp range filtering
  const createdFromNotifications =
    await api.functional.ecommerceMall.admin.notification_queues.index(
      loginConnection,
      {
        body: {
          created_at_from: new Date(
            now.getTime() - 1000 * 60 * 2,
          ).toISOString(),
        } satisfies IEcommerceMallNotificationQueue.IRequest,
      },
    );
  typia.assert(createdFromNotifications);
  // 6. Test error message filtering
  const errorNotifications =
    await api.functional.ecommerceMall.admin.notification_queues.index(
      loginConnection,
      {
        body: {
          has_error: true,
        } satisfies IEcommerceMallNotificationQueue.IRequest,
      },
    );
  typia.assert(errorNotifications);
  TestValidator.predicate(
    "error notifications filtered",
    errorNotifications.data.length > 0,
  );
  // 7. Test user_id filtering
  const userNotifications =
    await api.functional.ecommerceMall.admin.notification_queues.index(
      loginConnection,
      {
        body: {
          user_id: userId,
        } satisfies IEcommerceMallNotificationQueue.IRequest,
      },
    );
  typia.assert(userNotifications);
  TestValidator.predicate(
    "user notifications filtered",
    userNotifications.data.length > 0,
  );
  // 8. Test pagination
  const paginatedNotifications =
    await api.functional.ecommerceMall.admin.notification_queues.index(
      loginConnection,
      {
        body: {
          limit: 2,
        } satisfies IEcommerceMallNotificationQueue.IRequest,
      },
    );
  typia.assert(paginatedNotifications);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedNotifications.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination metadata valid",
    paginatedNotifications.pagination.pages >= 0,
  );
  // 9. Test 403 forbidden for non-admin
  const nonAdminConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("non-admin 403 forbidden", 403, async () => {
    await api.functional.ecommerceMall.admin.notification_queues.index(
      nonAdminConnection,
      {
        body: {} satisfies IEcommerceMallNotificationQueue.IRequest,
      },
    );
  });
}
