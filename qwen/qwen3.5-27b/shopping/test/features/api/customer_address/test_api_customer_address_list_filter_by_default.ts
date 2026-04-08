import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
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
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

/**
 * Test customer address list filtering by default status and other criteria.
 *
 * Validates the address filtering functionality for authenticated customers. The test creates multiple shipping addresses and verifies that filtering by default status (isDefault parameter) correctly returns only default or non-default addresses. Additionally tests search functionality and country filtering.
 *
 * The test ensures that:
 * - isDefault=true returns only addresses marked as default
 * - isDefault=false returns only non-default addresses
 * - Omitting isDefault returns all addresses
 * - Search parameter performs case-insensitive partial matching on recipient_name
 * - Country filter returns addresses matching the specified country
 * - Multiple filters can be combined effectively
 */
export async function test_api_customer_address_list_filter_by_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authResult);
  // 2. Create multiple addresses for testing
  const address1 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "John Doe",
          phone_number: RandomGenerator.mobile(),
          street_address: "123 Main Street",
          city: "Seoul",
          postal_code: "04524",
          country: "South Korea",
        },
      },
    );
  typia.assert(address1);
  const address2 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Jane Smith",
          phone_number: RandomGenerator.mobile(),
          street_address: "456 Oak Avenue",
          city: "Busan",
          postal_code: "48000",
          country: "South Korea",
        },
      },
    );
  typia.assert(address2);
  const address3 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Bob Johnson",
          phone_number: RandomGenerator.mobile(),
          street_address: "789 Pine Road",
          city: "New York",
          postal_code: "10001",
          country: "United States",
        },
      },
    );
  typia.assert(address3);
  // 3. Test isDefault=false filter (should return all since none are default)
  const nonDefaultResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          isDefault: false,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(nonDefaultResult);
  TestValidator.equals(
    "non-default addresses count",
    nonDefaultResult.data.length,
    3,
  );
  // 4. Test isDefault=true filter (should return empty since none are default)
  const defaultResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          isDefault: true,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals("default addresses count", defaultResult.data.length, 0);
  // 5. Test no filter (should return all addresses)
  const allResult = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(allResult);
  TestValidator.equals("all addresses count", allResult.data.length, 3);
  // 6. Test search filter (case-insensitive partial match)
  const searchResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          search: "john",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.equals("search results count", searchResult.data.length, 1);
  TestValidator.equals(
    "search result recipient name",
    searchResult.data[0].recipient_name,
    "John Doe",
  );
  // 7. Test country filter
  const countryResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          country: "South Korea",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(countryResult);
  TestValidator.equals(
    "South Korea addresses count",
    countryResult.data.length,
    2,
  );
  // 8. Test combined filters (search + country)
  const combinedResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          search: "jane",
          country: "South Korea",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter results count",
    combinedResult.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter recipient name",
    combinedResult.data[0].recipient_name,
    "Jane Smith",
  );
}
