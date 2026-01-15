import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFailedNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFailedNotification";
import type { ICommunityPlatformFailedNotificationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFailedNotificationMetadata";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFailedNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFailedNotification";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_failed_notifications_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = {
    host: connection.host,
  };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Authorization utility function automatically updates connection headers internally
  // Retrieve failed notifications with minimal pagination
  const response: IPageICommunityPlatformFailedNotification =
    await api.functional.communityPlatform.admin.failed_notifications.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformFailedNotification.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 1);
  TestValidator.predicate(
    "pagination records count",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count",
    response.pagination.pages >= 0,
  );
  // Validate at least one notification exists when records > 0
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "has at least one notification",
      response.data.length > 0,
    );
    const notification = response.data[0];
    // Verify existence of required fields (type system guarantees their existence and format)
    TestValidator.notEquals(
      "notification id is present",
      notification.id,
      null,
    );
    TestValidator.notEquals(
      "notification_event_id is present",
      notification.notification_event_id,
      null,
    );
    TestValidator.notEquals(
      "recipient_id is present",
      notification.recipient_id,
      null,
    );
    TestValidator.predicate(
      "recipient_type is a valid enum value",
      ["member", "guest", "admin"].includes(notification.recipient_type),
    );
    TestValidator.predicate(
      "delivery_channel is a valid enum value",
      ["email", "push", "sms"].includes(notification.delivery_channel),
    );
    TestValidator.notEquals(
      "failure_reason is present",
      notification.failure_reason,
      "",
    );
    TestValidator.predicate(
      "retry_count is valid",
      notification.retry_count >= 0 && notification.retry_count <= 5,
    );
    TestValidator.notEquals(
      "failed_at is present",
      notification.failed_at,
      null,
    );
    TestValidator.predicate(
      "status is a valid enum value",
      ["failed", "resolved"].includes(notification.status),
    );
    TestValidator.notEquals(
      "created_at is present",
      notification.created_at,
      null,
    );
    TestValidator.notEquals(
      "updated_at is present",
      notification.updated_at,
      null,
    );
    TestValidator.notEquals(
      "reason_code is present",
      notification.reason_code,
      "",
    );
    TestValidator.predicate(
      "error_source is a valid enum value",
      ["external_service", "internal_system", "network", "client"].includes(
        notification.error_source,
      ),
    );
    // Validate resolved_at is either null or valid date-time if present
    if (notification.resolved_at !== null) {
      TestValidator.notEquals(
        "resolved_at is valid date-time",
        notification.resolved_at,
        "",
      );
    }
    // Validate metadata is either null or an object
    if (notification.metadata !== null) {
      TestValidator.predicate(
        "metadata is an object",
        typeof notification.metadata === "object",
      );
    }
  }
}
