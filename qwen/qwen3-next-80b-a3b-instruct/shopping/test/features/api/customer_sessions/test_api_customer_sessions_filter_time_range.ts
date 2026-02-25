import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_filter_time_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a single customer with fixed credentials
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  // Create first session (most recent)
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized1 = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized1);
  // 2. Get current time
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  // 3. Create a session approximately 36 hours ago (within range)
  const customerConnection2: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_customer_login(customerConnection2, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(authorized2);
  // 4. Create a session approximately 60 hours ago (outside range)
  const customerConnection3: api.IConnection = { host: connection.host };
  const authorized3 = await authorize_customer_login(customerConnection3, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(authorized3);
  // 5. Create a session approximately 12 hours ago (too recent, outside range)
  const customerConnection4: api.IConnection = { host: connection.host };
  const authorized4 = await authorize_customer_login(customerConnection4, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(authorized4);
  // 6. Query all sessions for this customer with time range 24-48 hours ago
  const request: IShoppingMallCustomerSession.IRequest = {
    token_issued_at_range: {
      min: fortyEightHoursAgo.toISOString(),
      max: twentyFourHoursAgo.toISOString(),
    },
  };
  // We need to use any authenticated connection; the sessions will be returned for the customer
  const result = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(result);
  // 7. Validate pagination
  TestValidator.equals("pagination page is 1", result.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit is set",
    result.pagination.limit > 0,
  );
  // 8. Validate sessions in range
  // Get the created_at timestamps from the results
  const createdAts = result.data.map((session) => new Date(session.created_at));
  // Validate all returned sessions are within the 24-48 hour window
  const inRange = createdAts.every(
    (sessionTime) =>
      sessionTime >= fortyEightHoursAgo && sessionTime <= twentyFourHoursAgo,
  );
  TestValidator.predicate(
    "all returned sessions are in the 24-48 hour range",
    inRange,
  );
  // Validate that at least one session is in the range (36h session)
  TestValidator.predicate(
    "at least one session in range is returned",
    result.data.length >= 1,
  );
  // Validate that no session outside the range is returned
  const outsideRange = createdAts.some(
    (sessionTime) =>
      sessionTime < fortyEightHoursAgo || sessionTime > twentyFourHoursAgo,
  );
  TestValidator.predicate(
    "no sessions outside the range are returned",
    !outsideRange,
  );
}
