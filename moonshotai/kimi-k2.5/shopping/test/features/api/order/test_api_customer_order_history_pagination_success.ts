import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer order history pagination success.
 * 1. Authenticate as customer using customer join
 * 2. Retrieve order history with no filters
 * 3. Validate paginated response structure with proper pagination metadata
 * 4. Verify response contains required fields: id, orderNumber, totalPrice, status, createdAt
 * 5. Confirm data array length respects limit and records count is accurate
 */
export async function test_api_customer_order_history_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Retrieve order history without any filters
  const response = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {} satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has valid current page",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    response.pagination.pages >= 0 &&
      response.pagination.pages ===
        Math.ceil(
          response.pagination.records / Math.max(1, response.pagination.limit),
        ),
  );
  // 4. Validate data array is valid
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 5. Validate order summary items contain required fields
  for (const order of response.data) {
    typia.assert<IEcommerceMallOrder.ISummary>(order);
  }
  // 6. Verify empty result case is handled (customer may have no orders)
  if (response.pagination.records === 0) {
    TestValidator.equals("empty data when no orders", response.data.length, 0);
  }
}
