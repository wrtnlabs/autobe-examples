import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

/**
 * Test filtering customer addresses by default address status.
 *
 * This test verifies that the is_default filter parameter correctly
 * filters addresses based on their default designation status.
 *
 * Test Steps:
 * 1. Customer joins the platform using authorize_customer_join utility function
 * 2. Create a customer-specific connection with the authentication token
 * 3. Customer creates 3 shipping addresses using generate_random_shopping_mall_customer_addresses_create utility function
 * 4. Customer designates the first address as the default address using the update endpoint
 * 5. Customer requests the address list with is_default=true filter
 * 6. Verify only one address (the default) is returned with isDefault=true
 * 7. Customer requests the address list with is_default=false filter
 * 8. Verify exactly 2 non-default addresses are returned
 * 9. Verify the default address is excluded from the is_default=false results
 *
 * Validation Points:
 * - is_default filter correctly isolates default vs non-default addresses
 * - Only one address can be marked as default at a time
 * - Filter works correctly with the pagination response structure
 * - Response structure matches IPageIShoppingMallAddress.ISummary schema
 */
export async function test_api_customer_address_filter_by_default_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the platform
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create customer-specific connection
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customerAuth.token.access}`,
    },
  };
  // 3. Create 3 shipping addresses (none are default initially)
  const address1 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
        },
      },
    );
  typia.assert(address1);
  const address2 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
        },
      },
    );
  typia.assert(address2);
  const address3 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
        },
      },
    );
  typia.assert(address3);
  // 4. Designate the first address as the default address
  const updatedAddress1 =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: address1.id,
        body: {
          isDefault: true,
        } satisfies IShoppingMallAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress1);
  TestValidator.equals(
    "address1 is now default",
    updatedAddress1.is_default,
    true,
  );
  // 5. Request address list with is_default=true filter
  const defaultAddresses =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          is_default: true,
        } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(defaultAddresses);
  // 6. Verify only one address (the default) is returned
  TestValidator.equals(
    "default address count",
    defaultAddresses.data.length,
    1,
  );
  TestValidator.equals(
    "default address id",
    defaultAddresses.data[0].id,
    address1.id,
  );
  TestValidator.equals(
    "default address isDefault flag",
    defaultAddresses.data[0].isDefault,
    true,
  );
  // 7. Request address list with is_default=false filter
  const nonDefaultAddresses =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          is_default: false,
        } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(nonDefaultAddresses);
  // 8. Verify exactly 2 non-default addresses are returned
  TestValidator.equals(
    "non-default address count",
    nonDefaultAddresses.data.length,
    2,
  );
  // 9. Verify the default address is excluded from non-default results
  const nonDefaultIds = nonDefaultAddresses.data.map((addr) => addr.id);
  TestValidator.predicate(
    "address1 not in non-default list",
    () => !nonDefaultIds.includes(address1.id),
  );
  TestValidator.predicate("address2 in non-default list", () =>
    nonDefaultIds.includes(address2.id),
  );
  TestValidator.predicate("address3 in non-default list", () =>
    nonDefaultIds.includes(address3.id),
  );
  // Verify all non-default addresses have isDefault=false
  for (const addr of nonDefaultAddresses.data) {
    TestValidator.equals(
      "non-default address isDefault flag",
      addr.isDefault,
      false,
    );
  }
  // Verify pagination metadata
  TestValidator.equals(
    "default addresses pagination records",
    defaultAddresses.pagination.records,
    1,
  );
  TestValidator.equals(
    "non-default addresses pagination records",
    nonDefaultAddresses.pagination.records,
    2,
  );
}
