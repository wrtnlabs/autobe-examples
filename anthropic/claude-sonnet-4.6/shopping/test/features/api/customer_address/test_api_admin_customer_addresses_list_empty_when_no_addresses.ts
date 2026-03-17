import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_admin_customer_addresses_list_empty_when_no_addresses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account and obtain admin connection with JWT set
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register a new customer account (no addresses will be created)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerConnection,
    {},
  );
  const customerId = customerAuthorized.id;
  // 3. Admin retrieves the customer's address list (should be empty)
  const result =
    await api.functional.shoppingMall.admin.customers.addresses.index(
      adminConnection,
      {
        customerId,
        body: {} satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate the empty paginated response
  TestValidator.equals("data should be an empty array", result.data.length, 0);
  TestValidator.equals(
    "pagination.records should be 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    result.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination.current should be 1 (default)",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should be 20 (default)",
    result.pagination.limit,
    20,
  );
}
