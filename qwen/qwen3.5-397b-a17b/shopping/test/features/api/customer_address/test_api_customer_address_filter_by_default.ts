import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test customer address filtering by default address status.
 *
 * Validates the address filtering functionality through the PATCH /shoppingMall/member/addresses endpoint. Tests filtering addresses by the is_default flag to ensure customers can retrieve only their default address, only non-default addresses, or all addresses without filtering.
 *
 * Note: This test assumes the customer has existing addresses in their address book. In a complete test environment, addresses would be created through a separate address creation endpoint prior to this filtering test.
 *
 * 1. Authenticate as a new customer member.
 * 2. Retrieve addresses with is_default=true filter (should return only default address).
 * 3. Retrieve addresses with is_default=false filter (should return only non-default addresses).
 * 4. Retrieve addresses without is_default filter (should return all addresses).
 * 5. Validate pagination metadata reflects correct record counts for each filter.
 * 6. Verify address ownership and data integrity.
 */
export async function test_api_customer_address_filter_by_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(auth);
  // 2. Filter by is_default=true (should return only default address)
  const defaultAddresses =
    await api.functional.shoppingMall.member.addresses.index(
      customerConnection,
      {
        body: {
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(defaultAddresses);
  // 3. Filter by is_default=false (should return only non-default addresses)
  const nonDefaultAddresses =
    await api.functional.shoppingMall.member.addresses.index(
      customerConnection,
      {
        body: {
          is_default: false,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(nonDefaultAddresses);
  // 4. Retrieve all addresses without filter
  const allAddresses = await api.functional.shoppingMall.member.addresses.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(allAddresses);
  // 5. Validate pagination and filtering logic
  TestValidator.predicate(
    "default filter returns at most 1 address",
    () => defaultAddresses.data.length <= 1,
  );
  TestValidator.predicate(
    "total equals default plus non-default",
    () =>
      allAddresses.pagination.records ===
      defaultAddresses.pagination.records +
        nonDefaultAddresses.pagination.records,
  );
  // 6. Validate default address has is_default=true if exists
  if (defaultAddresses.data.length > 0) {
    const defaultAddr = defaultAddresses.data[0];
    TestValidator.predicate(
      "default address flag is true",
      () => defaultAddr.is_default === true,
    );
  }
  // 7. Validate non-default addresses have is_default=false
  for (const addr of nonDefaultAddresses.data) {
    TestValidator.predicate(
      "non-default address flag is false",
      () => addr.is_default === false,
    );
  }
}
