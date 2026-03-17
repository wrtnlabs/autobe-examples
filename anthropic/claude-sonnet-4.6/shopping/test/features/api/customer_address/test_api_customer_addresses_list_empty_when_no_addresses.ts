import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

export async function test_api_customer_addresses_list_empty_when_no_addresses(
  connection: api.IConnection,
): Promise<void> {
  // === Scenario 1: Brand-new customer with no addresses ===
  // Create isolated customer connection
  const customerConnection1: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection1, {});
  // List addresses for fresh customer - should be empty
  const emptyPage = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection1,
    {
      body: {} satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(emptyPage);
  // Validate empty state
  TestValidator.equals(
    "empty data array for new customer",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals("records should be 0", emptyPage.pagination.records, 0);
  TestValidator.equals("pages should be 0", emptyPage.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1",
    emptyPage.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 20", emptyPage.pagination.limit, 20);
  // === Scenario 2: Soft-deleted address is excluded from listing ===
  // Create another isolated customer connection
  const customerConnection2: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection2, {});
  // Create one address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection2,
    {},
  );
  typia.assert(address);
  // Delete (soft-delete) the address
  await api.functional.shoppingMall.customer.addresses.erase(
    customerConnection2,
    {
      addressId: address.id,
    },
  );
  // List addresses after deletion - should be empty again
  const pageAfterDelete =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection2,
      {
        body: {} satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(pageAfterDelete);
  // Validate deleted address does NOT appear
  TestValidator.equals(
    "data array empty after soft-delete",
    pageAfterDelete.data.length,
    0,
  );
  TestValidator.equals(
    "records should be 0 after soft-delete",
    pageAfterDelete.pagination.records,
    0,
  );
}
