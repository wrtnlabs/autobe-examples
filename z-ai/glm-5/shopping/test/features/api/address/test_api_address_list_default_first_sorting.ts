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

export async function test_api_address_list_default_first_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {});
  typia.assert(authResult);
  // 2. Retrieve address list
  const addressList =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(addressList);
  // 3. Validate sorting behavior
  const addresses = addressList.data;
  // If addresses exist, verify sorting rules
  if (addresses.length > 0) {
    // Check that exactly one address is default (if any exist)
    const defaultAddresses = addresses.filter(
      (addr) => addr.is_default === true,
    );
    TestValidator.equals(
      "exactly one default address",
      defaultAddresses.length,
      1,
    );
    // Default address must be first in the list
    TestValidator.equals(
      "default address is first",
      addresses[0].is_default,
      true,
    );
    // Non-default addresses should be sorted by created_at descending
    if (addresses.length > 1) {
      for (let i = 1; i < addresses.length - 1; i++) {
        const current = new Date(addresses[i].created_at).getTime();
        const next = new Date(addresses[i + 1].created_at).getTime();
        TestValidator.predicate(
          `non-default addresses sorted by created_at desc at index ${i}`,
          current >= next,
        );
      }
    }
  }
  // 4. Validate pagination accuracy
  TestValidator.equals(
    "pagination current page",
    addressList.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records match data length",
    addressList.pagination.records,
    addresses.length,
  );
}
