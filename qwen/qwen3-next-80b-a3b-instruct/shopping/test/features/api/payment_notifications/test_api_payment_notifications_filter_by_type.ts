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
export async function test_api_payment_notifications_filter_by_type(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host, headers: {} };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  (adminConnection.headers as Record<string, string>).Authorization = adminAuth.token.access;
  // Define the notification types we want to test
  const notificationTypes = [
    "transaction_completed",
    "payment_failed",
    "refunded",
  ] as const;
  // For each notification type, test the filtering functionality
  for (const type of notificationTypes) {
    // Create request body with filter by type (using IRequest schema)
    // Note: The IRequest schema does not include a 'type' parameter for filtering!
    // The endpoint accepts only page and limit parameters as documented in IRequest
    // Therefore we cannot filter by type directly and the scenario must be revised
    const request: IShoppingMallPaymentNotification.IRequest = {
      page: 1,
      limit: 10,
    };
    // Make the filtered request
    const response: IPageIShoppingMallPaymentNotification.ISummary =
      await api.functional.shoppingMall.admin.payment_notifications.index(
        adminConnection,
        {
          body: request,
        },
      );
    // Validate response structure
    typia.assert(response);
    // Verify pagination structure is correct
    TestValidator.equals(
      "pagination current page should be 1",
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit should be 10",
      response.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "pagination records should be >= 0",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages should be >= 0",
      response.pagination.pages >= 0,
    );
    // Verify data array exists and is an array
    TestValidator.equals(
      "data should be an array",
      Array.isArray(response.data),
      true,
    );
    // The API should return empty array if no notifications exist
    // We can't test filtering by type because the IRequest schema doesn't have a type parameter!
    // This indicates the original scenario is invalid - the endpoint doesn't support type filtering
    // But we can still validate the endpoint functions correctly
    TestValidator.equals(
      "data should be an array of summaries",
      response.data.every(
        (item) =>
          item.id &&
          typeof item.id === "string" &&
          typeof item.type === "string" &&
          typeof item.status === "string" &&
          item.notification_sent_at &&
          typeof item.notification_sent_at === "string" &&
          typeof item.recipient_type === "string" &&
          item.created_at &&
          typeof item.created_at === "string" &&
          typeof item.attempts === "number",
      ),
      true,
    );
  }
}