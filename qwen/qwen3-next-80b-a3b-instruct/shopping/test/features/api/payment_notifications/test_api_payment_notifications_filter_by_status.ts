import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentNotification";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentNotification";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_notifications_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "AdminPassword123!",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(authResult);
  // Test notification retrieval with pagination
  const request = {
    page: 1,
    limit: 5,
  } satisfies IShoppingMallPaymentNotification.IRequest;
  const response: IPageIShoppingMallPaymentNotification.ISummary =
    await api.functional.shoppingMall.admin.payment_notifications.index(
      adminConnection,
      { body: request },
    );
  typia.assert(response);
  // Validate structure of response
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 5", response.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate structure of data elements
  for (const notification of response.data) {
    // Validate required fields exist and have correct types
    TestValidator.predicate(
      "notification id is a valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        notification.id,
      ),
    );
    TestValidator.predicate(
      "notification type is a non-empty string",
      notification.type !== "" && typeof notification.type === "string",
    );
    TestValidator.predicate(
      "notification status is a non-empty string",
      notification.status !== "" && typeof notification.status === "string",
    );
    TestValidator.predicate(
      "notification recipient type is a non-empty string",
      notification.recipient_type !== "" &&
        typeof notification.recipient_type === "string",
    );
    TestValidator.predicate(
      "notification created_at is ISO datetime format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        notification.created_at,
      ),
    );
    TestValidator.predicate(
      "notification notification_sent_at is ISO datetime format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        notification.notification_sent_at,
      ),
    );
    TestValidator.predicate(
      "notification attempts is a non-negative integer",
      Number.isInteger(notification.attempts) && notification.attempts >= 0,
    );
    TestValidator.predicate(
      "notification message_summary is a non-empty string",
      notification.message_summary !== "" &&
        typeof notification.message_summary === "string",
    );
    // Validate optional fields
    if (
      notification.error_code !== null &&
      notification.error_code !== undefined
    ) {
      TestValidator.predicate(
        "error_code is a string",
        typeof notification.error_code === "string",
      );
    }
  }
  // Ensure we got some notifications
  TestValidator.predicate(
    "at least one notification returned",
    response.data.length > 0,
  );
}
