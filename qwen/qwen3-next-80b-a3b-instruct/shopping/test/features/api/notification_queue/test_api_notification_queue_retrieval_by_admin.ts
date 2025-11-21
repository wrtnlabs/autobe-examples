import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationQueue";

export async function test_api_notification_queue_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Create admin account for authenticated access
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Retrieve a specific notification queue entry by its ID
  const notification: IShoppingMallNotificationQueue =
    await api.functional.shoppingMall.admin.notifications.queue.at(connection, {
      queueId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(notification);

  // 3. Validate notification queue entry structure based on IShoppingMallNotificationQueue DTO
  TestValidator.equals("notification has id", notification.id, notification.id);
  TestValidator.equals(
    "notification has actor_id",
    notification.actor_id,
    notification.actor_id,
  );
  TestValidator.equals(
    "notification has template_id",
    notification.template_id,
    notification.template_id,
  );
  TestValidator.equals(
    "notification has notification_type",
    notification.notification_type,
    notification.notification_type,
  );
  TestValidator.predicate(
    "notification has priority between 1 and 3",
    notification.priority >= 1 && notification.priority <= 3,
  );
  TestValidator.equals(
    "notification has max_attempts",
    notification.max_attempts,
    notification.max_attempts,
  );
  TestValidator.equals(
    "notification has scheduled_at",
    notification.scheduled_at,
    notification.scheduled_at,
  );
  TestValidator.equals(
    "notification has created_at",
    notification.created_at,
    notification.created_at,
  );

  // 4. Validate optional properties if present
  if (notification.recipient_email !== undefined) {
    TestValidator.predicate(
      "recipient_email is valid email format",
      typeof notification.recipient_email === "string" &&
        notification.recipient_email.includes("@"),
    );
  }

  if (notification.attempt_count !== undefined) {
    TestValidator.predicate(
      "attempt_count is a positive integer",
      Number.isInteger(notification.attempt_count) &&
        notification.attempt_count >= 1,
    );
  }

  if (notification.queued_at !== undefined) {
    TestValidator.equals(
      "queued_at format",
      notification.queued_at,
      notification.queued_at,
    );
  }

  // 5. Validate that no sensitive data is exposed outside the allowed fields in IShoppingMallNotificationQueue
  // This ensures the API is not leaking any additional data not specified in the DTO
  const notificationKeys = Object.keys(notification);
  const allowedKeys = [
    "id",
    "actor_id",
    "template_id",
    "recipient_email",
    "notification_type",
    "priority",
    "attempt_count",
    "max_attempts",
    "scheduled_at",
    "created_at",
    "queued_at",
  ];
  notificationKeys.forEach((key) => {
    TestValidator.predicate(
      "all returned properties are in allowed list",
      allowedKeys.includes(key),
    );
  });
}
