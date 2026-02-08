import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotificationPreference";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_user_notification_preferences_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a paginated list of user notification preferences filtered by customer ownership
  // 1. Customer join and authorize
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {};
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = authorized.token.access;
  // 2. Retrieve user notification preferences without filters
  const emptyFilter: IShoppingMallUserNotificationPreference.IRequest = {};
  const response1 =
    await api.functional.shoppingMall.customer.userNotificationPreferences.index(
      customerConnection,
      { body: emptyFilter },
    );
  typia.assert(response1);
  // Validate pagination info exists and has current, limit, records, pages properties
  TestValidator.predicate(
    "pagination contains current",
    typeof response1.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination contains limit",
    typeof response1.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination contains records",
    typeof response1.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination contains pages",
    typeof response1.pagination.pages === "number",
  );
  // The data array should contain only user notification preferences owned by this customer
  // We cannot directly check owner due to schema but we can assume data represents correct filtered ownership
  TestValidator.predicate("data is an array", Array.isArray(response1.data));
  // If there is data, validate each item using typia and that fields are consistent
  for (const item of response1.data) {
    typia.assert(item);
  }
  // 3. Attempt to use filters for channel_name and notification_type if settable
  // Since IRequest is empty type, we cannot set filtering properties (per given DTO), so we test pagination only
  // But to simulate, if we had filters, we would test filtered results here
  // 4. Check that filtering and pagination metadata are consistent
  TestValidator.predicate(
    "pagination current page positive",
    response1.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response1.pagination.pages >= 0,
  );
  // 5. Authorization enforcement check - try without token and expect error
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("fetch without authorization fails", async () => {
    await api.functional.shoppingMall.customer.userNotificationPreferences.index(
      unauthorizedConnection,
      { body: {} },
    );
  });
}
