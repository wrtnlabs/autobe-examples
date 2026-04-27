import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

/**
 * Test that a super administrator can filter a customer's addresses by default status and search across address fields using text search.
 *
 * Validates the super-administrator address listing endpoint with filter and search capabilities. Ensures that the `isDefault` boolean filter correctly narrows results, that the `search` text parameter matches across recipient name and city fields, and that combined filter+search queries return the expected intersection of results.
 *
 * Also verifies that querying a non-existent customer ID returns a 404 Not Found error.
 *
 * 1. Join as administrator, then promote to super administrator.
 * 2. Join as a new customer and create three shipping addresses with specific recipient names, cities, and default flags.
 * 3. As super administrator, filter by isDefault flag and verify the correct addresses are returned.
 * 4. As super administrator, search by text across address fields and verify correct subset is returned.
 * 5. As super administrator, combine isDefault filter with text search and verify intersection results.
 * 6. Generate a non-existent customer UUID and verify 404 Not Found.
 */
export async function test_api_super_administrator_customer_address_filter_and_search(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup ----
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdminConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Join as administrator
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminResult);
  // 2. Promote to super administrator
  const superAdminResult = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: adminResult.id,
      },
    },
  );
  typia.assert(superAdminResult);
  // 3. Join as customer
  const customerResult = await authorize_customer_join(customerConnection, {});
  typia.assert(customerResult);
  // 4. Create three shipping addresses with specific fields
  // Address A: default address (Alice Smith, Seoul)
  const addressA =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Alice Smith",
          city: "Seoul",
          country: "South Korea",
          is_default: true,
        },
      },
    );
  typia.assert(addressA);
  // Address B: non-default (Bob Jones, Busan)
  const addressB =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Bob Jones",
          city: "Busan",
          country: "South Korea",
          is_default: false,
        },
      },
    );
  typia.assert(addressB);
  // Address C: non-default (Alice Johnson, Seoul)
  const addressC =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Alice Johnson",
          city: "Seoul",
          country: "South Korea",
          is_default: false,
        },
      },
    );
  typia.assert(addressC);
  // ---- Test 1: Filter by isDefault ----
  // 1a. isDefault = true -> only Address A
  const defaultResult =
    await api.functional.eCommerceMall.superAdministrator.customers.addresses.index(
      superAdminConnection,
      {
        customerId: customerResult.id,
        body: {
          isDefault: true,
        } satisfies IECommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default address filter - records count",
    defaultResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "default address filter - recipient name",
    defaultResult.data[0].recipientName,
    "Alice Smith",
  );
  // 1b. isDefault = false -> Addresses B and C
  const nonDefaultResult =
    await api.functional.eCommerceMall.superAdministrator.customers.addresses.index(
      superAdminConnection,
      {
        customerId: customerResult.id,
        body: {
          isDefault: false,
        } satisfies IECommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(nonDefaultResult);
  TestValidator.equals(
    "non-default address filter - records count",
    nonDefaultResult.pagination.records,
    2,
  );
  // ---- Test 2: Text search ----
  // 2a. search = "Alice" -> Address A (Alice Smith) and C (Alice Johnson)
  const searchAliceResult =
    await api.functional.eCommerceMall.superAdministrator.customers.addresses.index(
      superAdminConnection,
      {
        customerId: customerResult.id,
        body: {
          search: "Alice",
        } satisfies IECommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(searchAliceResult);
  TestValidator.equals(
    "search 'Alice' - records count",
    searchAliceResult.pagination.records,
    2,
  );
  TestValidator.predicate("search 'Alice' includes Alice Smith", () =>
    searchAliceResult.data.some((a) => a.recipientName === "Alice Smith"),
  );
  TestValidator.predicate("search 'Alice' includes Alice Johnson", () =>
    searchAliceResult.data.some((a) => a.recipientName === "Alice Johnson"),
  );
  TestValidator.predicate("search 'Alice' excludes Bob Jones", () =>
    searchAliceResult.data.every((a) => a.recipientName !== "Bob Jones"),
  );
  // 2b. search = "Busan" -> only Address B (Bob Jones)
  const searchBusanResult =
    await api.functional.eCommerceMall.superAdministrator.customers.addresses.index(
      superAdminConnection,
      {
        customerId: customerResult.id,
        body: {
          search: "Busan",
        } satisfies IECommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(searchBusanResult);
  TestValidator.equals(
    "search 'Busan' - records count",
    searchBusanResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "search 'Busan' - recipient name",
    searchBusanResult.data[0].recipientName,
    "Bob Jones",
  );
  // 2c. search = "New York" -> no results
  const searchNewYorkResult =
    await api.functional.eCommerceMall.superAdministrator.customers.addresses.index(
      superAdminConnection,
      {
        customerId: customerResult.id,
        body: {
          search: "New York",
        } satisfies IECommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(searchNewYorkResult);
  TestValidator.equals(
    "search 'New York' - records count",
    searchNewYorkResult.pagination.records,
    0,
  );
  // ---- Test 3: Combined isDefault + search ----
  // 3a. isDefault=true, search="Alice" -> only Address A (Alice Smith, the default)
  const combinedDefaultAliceResult =
    await api.functional.eCommerceMall.superAdministrator.customers.addresses.index(
      superAdminConnection,
      {
        customerId: customerResult.id,
        body: {
          isDefault: true,
          search: "Alice",
        } satisfies IECommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(combinedDefaultAliceResult);
  TestValidator.equals(
    "default + search 'Alice' - records count",
    combinedDefaultAliceResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "default + search 'Alice' - recipient name",
    combinedDefaultAliceResult.data[0].recipientName,
    "Alice Smith",
  );
  // 3b. isDefault=false, search="Alice" -> only Address C (Alice Johnson, the non-default matching 'Alice')
  const combinedNonDefaultAliceResult =
    await api.functional.eCommerceMall.superAdministrator.customers.addresses.index(
      superAdminConnection,
      {
        customerId: customerResult.id,
        body: {
          isDefault: false,
          search: "Alice",
        } satisfies IECommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(combinedNonDefaultAliceResult);
  TestValidator.equals(
    "non-default + search 'Alice' - records count",
    combinedNonDefaultAliceResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "non-default + search 'Alice' - recipient name",
    combinedNonDefaultAliceResult.data[0].recipientName,
    "Alice Johnson",
  );
  // 3c. isDefault=true, search="Busan" -> no results (default address is in Seoul)
  const combinedDefaultBusanResult =
    await api.functional.eCommerceMall.superAdministrator.customers.addresses.index(
      superAdminConnection,
      {
        customerId: customerResult.id,
        body: {
          isDefault: true,
          search: "Busan",
        } satisfies IECommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(combinedDefaultBusanResult);
  TestValidator.equals(
    "default + search 'Busan' - records count",
    combinedDefaultBusanResult.pagination.records,
    0,
  );
  // ---- Test 4: Customer not found ----
  const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("customer not found - 404", 404, async () => {
    await api.functional.eCommerceMall.superAdministrator.customers.addresses.index(
      superAdminConnection,
      {
        customerId: nonExistentCustomerId,
        body: {} satisfies IECommerceMallCustomerAddress.IRequest,
      },
    );
  });
}
