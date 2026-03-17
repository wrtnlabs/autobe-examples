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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

export async function test_api_admin_customer_addresses_list_with_multiple_addresses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  const customerId = customerAuth.id;
  // 3. Create first address (non-default, work address)
  const workAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
          country: "US",
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          addressLine1: "456 Work Ave",
          city: "New York",
          state: "NY",
          postalCode: "10001",
        },
      },
    );
  typia.assert(workAddress);
  // 4. Create second address (default, home address)
  const homeAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: true,
          country: "US",
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          addressLine1: "123 Home St",
          city: "Los Angeles",
          state: "CA",
          postalCode: "90001",
        },
      },
    );
  typia.assert(homeAddress);
  // 5. Admin retrieves customer addresses with sort: 'default_first'
  const result =
    await api.functional.shoppingMall.admin.customers.addresses.index(
      adminConnection,
      {
        customerId,
        body: {
          page: 1,
          limit: 20,
          sort: "default_first",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(result);
  // 6. Validate pagination
  TestValidator.equals(
    "pagination records count",
    result.pagination.records,
    2,
  );
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.predicate("data has 2 items", result.data.length === 2);
  // 7. Validate default_first sort: first item must be the default address
  TestValidator.equals(
    "first item is default address",
    result.data[0].isDefault,
    true,
  );
  TestValidator.equals(
    "first item id matches home address",
    result.data[0].id,
    homeAddress.id,
  );
  // 8. Validate exactly one default address
  const defaultAddresses = result.data.filter((addr) => addr.isDefault);
  TestValidator.equals(
    "exactly one default address",
    defaultAddresses.length,
    1,
  );
  // 9. Validate both addresses are present
  const addressIds = result.data.map((addr) => addr.id);
  TestValidator.predicate(
    "work address in result",
    addressIds.includes(workAddress.id),
  );
  TestValidator.predicate(
    "home address in result",
    addressIds.includes(homeAddress.id),
  );
  // 10. Validate non-default address is not the default
  const nonDefaultAddresses = result.data.filter((addr) => !addr.isDefault);
  TestValidator.equals(
    "exactly one non-default address",
    nonDefaultAddresses.length,
    1,
  );
  TestValidator.equals(
    "non-default address id matches work address",
    nonDefaultAddresses[0].id,
    workAddress.id,
  );
}
