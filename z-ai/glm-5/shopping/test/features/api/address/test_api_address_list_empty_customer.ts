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

export async function test_api_address_list_empty_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new customer-specific connection for isolation
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Register a new customer using the utility function
  // This authenticates the customer and updates customerConnection headers with token
  await authorize_customer_join(customerConnection, {});
  // 3. Retrieve the address list for the newly registered customer
  const addressList =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(addressList);
  // 4. Validate the response structure and empty state
  // Business validation: Empty address list should return successfully
  TestValidator.equals("data array should be empty", addressList.data, []);
  // Business validation: Pagination metadata should accurately reflect zero records
  TestValidator.equals(
    "pagination current page should be 1",
    addressList.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be default 20",
    addressList.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records should be 0",
    addressList.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    addressList.pagination.pages,
    0,
  );
}
