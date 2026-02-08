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

export async function test_api_customer_user_notification_preferences_no_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and authorize
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  // 2. Query user notification preferences with filter that yields no results
  //    Since IShoppingMallUserNotificationPreference.IRequest is empty object,
  //    send an empty filter (means no search criteria, default pagination)
  const output =
    await api.functional.shoppingMall.customer.userNotificationPreferences.index(
      customerConnection,
      {
        body: {},
      },
    );
  // 3. Validate the response structure and that data array is empty
  typia.assert(output);
  // 4. Verify empty data and valid pagination info
  TestValidator.equals("data is empty array", output.data.length, 0);
  TestValidator.predicate(
    "pagination current page number >= 0",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    output.pagination.limit >= 0,
  );
  TestValidator.equals(
    "pagination records count is 0",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count is 0",
    output.pagination.pages,
    0,
  );
}
