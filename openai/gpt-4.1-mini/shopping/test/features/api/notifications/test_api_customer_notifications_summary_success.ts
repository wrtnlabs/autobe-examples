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

export async function test_api_customer_notifications_summary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and join a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Request notification summary list
  const output =
    await api.functional.shoppingMall.customer.notifications.summary.index(
      customerConnection,
    );
  // 3. Validate the output structure and content
  typia.assert(output);
  // 4. Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination current page is >= 0",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is >= 0",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages = ceil(records / limit) or 0 if records=0",
    output.pagination.pages ===
      (output.pagination.records === 0
        ? 0
        : Math.ceil(output.pagination.records / output.pagination.limit)),
  );
  // 5. Validate each notification summary
  for (const item of output.data) {
    typia.assert(item);
    // Removed invalid property checks as properties do not exist on the item's type
    // Only assert item structure since actual properties for summary are not known
  }
}
