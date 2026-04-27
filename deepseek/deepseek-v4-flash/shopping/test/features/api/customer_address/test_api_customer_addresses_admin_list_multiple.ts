import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
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
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

/**
 * Test that an authenticated administrator can retrieve a paginated list of active shipping addresses for a customer who has multiple saved addresses.
 *
 * Validates that the administrator can view all non-deleted addresses belonging to a specific customer, with proper pagination metadata and sorting by newest first. The response includes all required summary fields per address including the owning customer reference with profile information.
 *
 * Special attention is given to verifying that only one address is marked as the default, and each address snapshot contains the complete recipient and location details along with the customer summary.
 *
 * 1. Register an administrator account via join.
 * 2. Register a customer account via join.
 * 3. Customer creates 3 shipping addresses with distinct cities and recipient names, one marked as default.
 * 4. Administrator calls the paginated addresses list endpoint for the customer.
 * 5. Validates pagination metadata, address count, default address singleton, required fields, customer reference, and creation timestamp ordering.
 */
export async function test_api_customer_addresses_admin_list_multiple(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IECommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Create 3 addresses for the customer with different cities, one as default
  const address1 =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          city: "Seoul",
          is_default: true,
        },
      },
    );
  typia.assert(address1);
  const address2 =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          city: "Busan",
          is_default: false,
        },
      },
    );
  typia.assert(address2);
  const address3 =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          city: "Incheon",
          is_default: false,
        },
      },
    );
  typia.assert(address3);
  // 4. Admin lists customer addresses with pagination
  const response =
    await api.functional.eCommerceMall.administrator.customers.addresses.index(
      adminConnection,
      {
        customerId: customer.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IECommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals("pagination records", response.pagination.records, 3);
  TestValidator.equals("pagination pages", response.pagination.pages, 1);
  // 6. Validate data contains 3 addresses
  TestValidator.equals("address count", response.data.length, 3);
  // 7. Validate exactly one address is default
  const defaultAddresses = response.data.filter((addr) => addr.isDefault);
  TestValidator.equals("default address count", defaultAddresses.length, 1);
  // 8. Validate the default address city matches our first address
  TestValidator.equals(
    "default address city",
    defaultAddresses[0]!.city,
    "Seoul",
  );
  // 9. Validate each address has complete ISummary fields with customer reference
  for (const addr of response.data) {
    TestValidator.predicate(
      "address has id",
      () => typeof addr.id === "string",
    );
    TestValidator.predicate(
      "address has recipientName",
      () => typeof addr.recipientName === "string",
    );
    TestValidator.predicate(
      "address has phoneNumber",
      () => typeof addr.phoneNumber === "string",
    );
    TestValidator.predicate(
      "address has streetAddress",
      () => typeof addr.streetAddress === "string",
    );
    TestValidator.predicate(
      "address has city",
      () => typeof addr.city === "string",
    );
    TestValidator.predicate(
      "address has stateProvince",
      () => typeof addr.stateProvince === "string",
    );
    TestValidator.predicate(
      "address has postalCode",
      () => typeof addr.postalCode === "string",
    );
    TestValidator.predicate(
      "address has country",
      () => typeof addr.country === "string",
    );
    TestValidator.predicate(
      "address has isDefault",
      () => typeof addr.isDefault === "boolean",
    );
    TestValidator.predicate(
      "address has createdAt",
      () => typeof addr.createdAt === "string",
    );
    TestValidator.predicate(
      "address has customer reference",
      () => addr.customer != null,
    );
    TestValidator.predicate(
      "customer has id",
      () => typeof addr.customer.id === "string",
    );
    TestValidator.predicate(
      "customer has email",
      () => typeof addr.customer.email === "string",
    );
    TestValidator.predicate(
      "customer has profile",
      () => addr.customer.profile != null,
    );
    if (addr.customer.profile) {
      const profile = addr.customer.profile;
      TestValidator.predicate(
        "profile has display_name",
        () => typeof profile.display_name === "string",
      );
    }
  }
  // 10. Validate addresses sorted by createdAt descending (newest first)
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = new Date(response.data[i].createdAt).getTime();
    const next = new Date(response.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `address ${i} created after address ${i + 1}`,
      () => current >= next,
    );
  }
}