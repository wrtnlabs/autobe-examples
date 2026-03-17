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

/**
 * Test customer address list retrieval with default filter.
 * 1. Customer authenticates via join
 * 2. Customer retrieves address list with is_default=true filter
 * 3. Verify only default addresses are returned (if any exist)
 * 4. Customer retrieves address list with is_default=false filter
 * 5. Verify only non-default addresses are returned (if any exist)
 * 6. Customer retrieves all addresses without filter
 * 7. Verify all addresses are returned with correct is_default flags
 */
export async function test_api_customer_address_list_with_default_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve addresses with is_default=true filter
  const defaultAddresses =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          is_default: true,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(defaultAddresses);
  // 3. Validate default addresses response
  TestValidator.equals(
    "default addresses pagination exists",
    defaultAddresses.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "default addresses data is array",
    Array.isArray(defaultAddresses.data),
  );
  // If there are default addresses, verify all have is_default=true
  if (defaultAddresses.data.length > 0) {
    const allDefault = defaultAddresses.data.every(
      (addr) => addr.is_default === true,
    );
    TestValidator.predicate("all returned addresses are default", allDefault);
  }
  // 4. Retrieve addresses with is_default=false filter
  const nonDefaultAddresses =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          is_default: false,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(nonDefaultAddresses);
  // 5. Validate non-default addresses response
  TestValidator.equals(
    "non-default addresses pagination exists",
    nonDefaultAddresses.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "non-default addresses data is array",
    Array.isArray(nonDefaultAddresses.data),
  );
  // If there are non-default addresses, verify all have is_default=false
  if (nonDefaultAddresses.data.length > 0) {
    const allNonDefault = nonDefaultAddresses.data.every(
      (addr) => addr.is_default === false,
    );
    TestValidator.predicate(
      "all returned addresses are non-default",
      allNonDefault,
    );
  }
  // 6. Retrieve all addresses without filter
  const allAddresses =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(allAddresses);
  // 7. Validate all addresses response
  TestValidator.equals(
    "all addresses pagination exists",
    allAddresses.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "all addresses count matches",
    allAddresses.data.length,
    defaultAddresses.data.length + nonDefaultAddresses.data.length,
  );
  // Verify all addresses have required fields
  for (const address of allAddresses.data) {
    TestValidator.predicate("address has id", address.id !== undefined);
    TestValidator.predicate(
      "address has recipient_name",
      address.recipient_name !== undefined,
    );
    TestValidator.predicate(
      "address has phone_number",
      address.phone_number !== undefined,
    );
    TestValidator.predicate(
      "address has street_address",
      address.street_address !== undefined,
    );
    TestValidator.predicate("address has city", address.city !== undefined);
    TestValidator.predicate(
      "address has state_province",
      address.state_province !== undefined,
    );
    TestValidator.predicate(
      "address has postal_code",
      address.postal_code !== undefined,
    );
    TestValidator.predicate(
      "address has country",
      address.country !== undefined,
    );
    TestValidator.predicate(
      "address has is_default",
      address.is_default !== undefined,
    );
    TestValidator.predicate(
      "address has customer",
      address.customer !== undefined,
    );
    TestValidator.predicate(
      "address has created_at",
      address.created_at !== undefined,
    );
  }
  // Verify customer reference in addresses
  for (const address of allAddresses.data) {
    TestValidator.equals(
      "address customer id matches",
      address.customer.id,
      customer.id,
    );
  }
  // Verify only one default address exists (business rule)
  TestValidator.predicate(
    "at most one default address",
    defaultAddresses.data.length <= 1,
  );
}
