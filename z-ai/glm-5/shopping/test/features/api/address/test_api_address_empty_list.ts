import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that a customer with no saved addresses receives an empty paginated
 * response with correct structure.
 *
 * Setup: Customer account with no addresses created.
 *
 * Test Steps:
 * 1. Authenticate as a new customer via join
 * 2. Call PATCH /addresses without creating any addresses
 * 3. Verify response structure and empty data
 *
 * Validation Points:
 * - Response returns IPageIShoppingMallAddress.ISummary structure
 * - data array is empty ([])
 * - pagination.current = 1 (default page)
 * - pagination.limit = 20 (default limit)
 * - pagination.records = 0
 * - pagination.pages = 0
 */
export async function test_api_address_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  // 2. Call addresses index with empty request body (no filters)
  const response = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallAddress.IRequest,
    },
  );
  // 3. Validate response structure
  typia.assert(response);
  // 4. Validate empty data array
  TestValidator.equals("data array is empty", response.data, []);
  // 5. Validate pagination metadata for empty result set
  TestValidator.equals(
    "pagination.current equals 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit equals 20",
    response.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination.records equals 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages equals 0",
    response.pagination.pages,
    0,
  );
}
