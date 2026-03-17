import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";

export async function test_api_customer_addresses_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Customer A and authenticate
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerAConnection, {
      body: {
        email: "customerA@test.com",
        password: "1234",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerA);
  // Create 2 addresses for Customer A
  const customerAAddress1 =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerAConnection,
      {
        body: {
          recipient_name: "Alice Johnson",
          recipient_phone: RandomGenerator.mobile(),
          street: "123 Main Street",
          city: "New York",
          state: "NY",
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(customerAAddress1);
  const customerAAddress2 =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerAConnection,
      {
        body: {
          recipient_name: "Alice Johnson Work",
          recipient_phone: RandomGenerator.mobile(),
          street: "456 Business Avenue",
          city: "Brooklyn",
          state: "NY",
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(customerAAddress2);
  // Step 2: Create Customer B and authenticate
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerBConnection, {
      body: {
        email: "customerB@test.com",
        password: "1234",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerB);
  // Create 3 addresses for Customer B
  const customerBAddress1 =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerBConnection,
      {
        body: {
          recipient_name: "Bob Smith",
          recipient_phone: RandomGenerator.mobile(),
          street: "789 Oak Lane",
          city: "Los Angeles",
          state: "CA",
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(customerBAddress1);
  const customerBAddress2 =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerBConnection,
      {
        body: {
          recipient_name: "Bob Smith Work",
          recipient_phone: RandomGenerator.mobile(),
          street: "321 Commerce Drive",
          city: "San Francisco",
          state: "CA",
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(customerBAddress2);
  const customerBAddress3 =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerBConnection,
      {
        body: {
          recipient_name: "Bob Smith Home",
          recipient_phone: RandomGenerator.mobile(),
          street: "555 Residential Court",
          city: "San Diego",
          state: "CA",
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(customerBAddress3);
  // Step 3: Customer A retrieves their addresses
  const customerAPage =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerAConnection,
      {
        body: {},
      },
    );
  typia.assert(customerAPage);
  // Step 4: Customer B retrieves their addresses
  const customerBPage =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerBConnection,
      {
        body: {},
      },
    );
  typia.assert(customerBPage);
  // Validation: Customer A should see exactly 2 addresses
  TestValidator.equals(
    "Customer A pagination records",
    customerAPage.pagination.records,
    2,
  );
  TestValidator.equals(
    "Customer A addresses count",
    customerAPage.data.length,
    2,
  );
  TestValidator.equals(
    "Customer A has correct pages",
    customerAPage.pagination.pages,
    1,
  );
  // Validation: Customer B should see exactly 3 addresses
  TestValidator.equals(
    "Customer B pagination records",
    customerBPage.pagination.records,
    3,
  );
  TestValidator.equals(
    "Customer B addresses count",
    customerBPage.data.length,
    3,
  );
  TestValidator.equals(
    "Customer B has correct pages",
    customerBPage.pagination.pages,
    1,
  );
  // Validation: Customer A's addresses should match created data
  const customerAAddresses = customerAPage.data;
  const customerARecipientNames = customerAAddresses.map(
    (addr) => addr.recipient_name,
  );
  const customerACities = customerAAddresses.map((addr) => addr.city);
  TestValidator.equals(
    "Customer A recipient name 1 matches",
    customerARecipientNames.includes("Alice Johnson"),
    true,
  );
  TestValidator.equals(
    "Customer A recipient name 2 matches",
    customerARecipientNames.includes("Alice Johnson Work"),
    true,
  );
  TestValidator.equals(
    "Customer A cities include New York",
    customerACities.includes("New York"),
    true,
  );
  TestValidator.equals(
    "Customer A cities include Brooklyn",
    customerACities.includes("Brooklyn"),
    true,
  );
  // Validation: Customer B's addresses should match created data
  const customerBAddresses = customerBPage.data;
  const customerBRecipientNames = customerBAddresses.map(
    (addr) => addr.recipient_name,
  );
  const customerBCities = customerBAddresses.map((addr) => addr.city);
  TestValidator.equals(
    "Customer B recipient name 1 matches",
    customerBRecipientNames.includes("Bob Smith"),
    true,
  );
  TestValidator.equals(
    "Customer B recipient name 2 matches",
    customerBRecipientNames.includes("Bob Smith Work"),
    true,
  );
  TestValidator.equals(
    "Customer B recipient name 3 matches",
    customerBRecipientNames.includes("Bob Smith Home"),
    true,
  );
  TestValidator.equals(
    "Customer B cities include Los Angeles",
    customerBCities.includes("Los Angeles"),
    true,
  );
  TestValidator.equals(
    "Customer B cities include San Francisco",
    customerBCities.includes("San Francisco"),
    true,
  );
  TestValidator.equals(
    "Customer B cities include San Diego",
    customerBCities.includes("San Diego"),
    true,
  );
  // Validation: No cross-customer data exposure
  const allCustomerAAddressIds = customerAAddresses.map((addr) => addr.id);
  const allCustomerBAddressIds = customerBAddresses.map((addr) => addr.id);
  TestValidator.equals(
    "Customer A sees no Customer B address ID",
    allCustomerAAddressIds.includes(customerBAddress1.id),
    false,
  );
  TestValidator.equals(
    "Customer A sees no Customer B address ID 2",
    allCustomerAAddressIds.includes(customerBAddress2.id),
    false,
  );
  TestValidator.equals(
    "Customer A sees no Customer B address ID 3",
    allCustomerAAddressIds.includes(customerBAddress3.id),
    false,
  );
  TestValidator.equals(
    "Customer B sees no Customer A address ID",
    allCustomerBAddressIds.includes(customerAAddress1.id),
    false,
  );
  TestValidator.equals(
    "Customer B sees no Customer A address ID 2",
    allCustomerBAddressIds.includes(customerAAddress2.id),
    false,
  );
}
