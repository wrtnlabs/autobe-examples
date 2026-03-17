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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

/**
 * Test authenticated customer can retrieve their complete list of shipping addresses
 * with proper ordering and pagination.
 *
 * Setup:
 * - Customer authentication via join
 * - Create 3 shipping addresses in different cities (first automatically becomes default)
 *
 * Validation:
 * - Response structure is IPageIShoppingMallAddress.ISummary
 * - All created addresses returned
 * - Default address appears first (is_default DESC)
 * - Non-default addresses sorted by created_at DESC
 * - Pagination metadata correct
 * - Exactly one default address
 */
export async function test_api_address_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(customer);
  // 2. Create 3 addresses in different cities
  // First address will automatically become default
  const address1 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          city: "Seoul",
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          stateProvince: "Seoul",
          postalCode: "04524",
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
          city: "Busan",
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          stateProvince: "Busan",
          postalCode: "48101",
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
          city: "Incheon",
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          stateProvince: "Incheon",
          postalCode: "22785",
          country: "South Korea",
        },
      },
    );
  typia.assert(address3);
  // 3. Retrieve all addresses
  const addresses = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(addresses);
  // 4. Validate pagination structure
  TestValidator.equals("current page", addresses.pagination.current, 1);
  TestValidator.predicate("total records", addresses.pagination.records >= 3);
  TestValidator.predicate("total pages", addresses.pagination.pages >= 1);
  TestValidator.predicate("limit is valid", addresses.pagination.limit >= 1);
  // 5. Validate all addresses returned
  TestValidator.predicate("3 addresses returned", addresses.data.length >= 3);
  // 6. Validate default address appears first
  const defaultAddresses = addresses.data.filter((a) => a.is_default === true);
  TestValidator.equals("exactly one default", defaultAddresses.length, 1);
  TestValidator.equals("default is first", addresses.data[0].is_default, true);
  // 7. Validate sorting: default first, then by created_at DESC
  if (addresses.data.length > 1) {
    const nonDefaultAddresses = addresses.data.slice(1);
    for (let i = 0; i < nonDefaultAddresses.length - 1; i++) {
      const current = new Date(nonDefaultAddresses[i].created_at).getTime();
      const next = new Date(nonDefaultAddresses[i + 1].created_at).getTime();
      TestValidator.predicate(
        "non-default sorted by created_at DESC",
        current >= next,
      );
    }
  }
}
