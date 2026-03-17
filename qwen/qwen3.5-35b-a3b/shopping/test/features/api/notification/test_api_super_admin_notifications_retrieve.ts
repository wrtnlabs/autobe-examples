import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super admin notifications retrieval with filtering, pagination, and validation.
 *
 * 1. Join as super admin and create authenticated connection
 * 2. Retrieve all notifications with default parameters
 * 3. Validate pagination metadata and notification structure
 * 4. Test type filtering
 * 5. Test read status filtering
 * 6. Test pagination with different page sizes
 */
export async function test_api_super_admin_notifications_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Default notification retrieval (no filters)
  const defaultNotifications =
    await api.functional.ecommerceMall.superAdmin.notifications.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultNotifications);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    defaultNotifications.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    defaultNotifications.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    defaultNotifications.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    defaultNotifications.pagination.pages >= 0,
  );
  // 4. Validate notification structure
  if (defaultNotifications.data.length > 0) {
    const sampleNotification = defaultNotifications.data[0];
    TestValidator.equals(
      "notification id is UUID",
      typeof sampleNotification.id,
      "string",
    );
    TestValidator.equals(
      "notification title is string",
      typeof sampleNotification.title,
      "string",
    );
    TestValidator.equals(
      "notification body is string",
      typeof sampleNotification.body,
      "string",
    );
    TestValidator.equals(
      "notification type is string",
      typeof sampleNotification.type,
      "string",
    );
    TestValidator.equals(
      "notification status is string",
      typeof sampleNotification.status,
      "string",
    );
    TestValidator.equals(
      "created_at is ISO date",
      typeof sampleNotification.created_at,
      "string",
    );
    TestValidator.equals(
      "updated_at is ISO date",
      typeof sampleNotification.updated_at,
      "string",
    );
    // Validate type enum values
    const validTypes = [
      "order_update",
      "seller_approval",
      "platform_announcement",
      "system_alert",
    ] as const;
    TestValidator.equals(
      "notification type is valid enum",
      validTypes.includes(sampleNotification.type as any),
      true,
    );
    // Validate status enum values
    const validStatuses = ["unread", "read"] as const;
    TestValidator.equals(
      "notification status is valid enum",
      validStatuses.includes(sampleNotification.status as any),
      true,
    );
  }
  // 5. Type filtering - test with system_alert
  const typeFilteredNotifications =
    await api.functional.ecommerceMall.superAdmin.notifications.index(
      adminConnection,
      {
        body: { type: "system_alert" },
      },
    );
  typia.assert(typeFilteredNotifications);
  // Validate all filtered notifications match type
  typeFilteredNotifications.data.forEach((notification) => {
    TestValidator.equals(
      `notification type matches filter (${notification.id})`,
      notification.type,
      "system_alert",
    );
  });
  // 6. Read status filtering - test with unread
  const statusFilteredNotifications =
    await api.functional.ecommerceMall.superAdmin.notifications.index(
      adminConnection,
      {
        body: { read_status: "unread" },
      },
    );
  typia.assert(statusFilteredNotifications);
  // Validate all filtered notifications match status
  statusFilteredNotifications.data.forEach((notification) => {
    TestValidator.equals(
      `notification status matches filter (${notification.id})`,
      notification.status,
      "unread",
    );
  });
  // 7. Pagination with different page sizes
  const smallPageNotifications =
    await api.functional.ecommerceMall.superAdmin.notifications.index(
      adminConnection,
      {
        body: { per_page: 10 },
      },
    );
  typia.assert(smallPageNotifications);
  TestValidator.equals(
    "small page limit",
    smallPageNotifications.pagination.limit,
    10,
  );
  const mediumPageNotifications =
    await api.functional.ecommerceMall.superAdmin.notifications.index(
      adminConnection,
      {
        body: { per_page: 20 },
      },
    );
  typia.assert(mediumPageNotifications);
  TestValidator.equals(
    "medium page limit",
    mediumPageNotifications.pagination.limit,
    20,
  );
  const largePageNotifications =
    await api.functional.ecommerceMall.superAdmin.notifications.index(
      adminConnection,
      {
        body: { per_page: 50 },
      },
    );
  typia.assert(largePageNotifications);
  TestValidator.equals(
    "large page limit",
    largePageNotifications.pagination.limit,
    50,
  );
  // 8. Validate total records consistency across different page sizes
  TestValidator.equals(
    "total records consistent across page sizes",
    smallPageNotifications.pagination.records,
    mediumPageNotifications.pagination.records,
  );
  TestValidator.equals(
    "total records consistent across page sizes",
    mediumPageNotifications.pagination.records,
    largePageNotifications.pagination.records,
  );
}
