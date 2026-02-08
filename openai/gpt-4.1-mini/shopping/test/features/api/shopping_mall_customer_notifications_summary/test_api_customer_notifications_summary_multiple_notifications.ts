import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test retrieval of notification summaries when there are multiple notifications.
 *
 * This test:
 * - Registers a new customer and authorizes their connection.
 * - Retrieves notification summaries via the API.
 * - Validates response structure and pagination.
 */
export async function test_api_customer_notifications_summary_multiple_notifications(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Retrieve notification summaries
  const summary: IPageIShoppingMallUserNotification.ISummary =
    await api.functional.shoppingMall.customer.notifications.summary.index(
      customerConnection,
    );
  // 3. Assert whole response structure
  typia.assert(summary);
  // 4. Basic pagination checks
  TestValidator.predicate(
    "pagination current is positive",
    summary.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    summary.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    summary.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    summary.pagination.pages >= 0,
  );
  // 5. Notifications data check
  TestValidator.predicate(
    "notifications data is array",
    Array.isArray(summary.data),
  );
  // 6. Assert all notifications with typia (schema is empty but still assert)
  for (const notification of summary.data) {
    typia.assert(notification);
  }
}
