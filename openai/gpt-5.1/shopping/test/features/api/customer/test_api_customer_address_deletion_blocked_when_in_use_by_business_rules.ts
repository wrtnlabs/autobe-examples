import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";

/**
 * Validate that a customer can create and then delete a shipping address.
 *
 * Business context:
 *
 * - Admins manage country master data that customers reference in their shipping
 *   addresses.
 * - Customers join and authenticate through dedicated /auth/customer endpoints.
 * - Customers manage their own shipping addresses under
 *   /shoppingMall/customer/customers/{customerId}/addresses.
 *
 * Although the original high-level requirement mentions blocking deletion when
 * an address is still in use by ongoing business processes (orders,
 * subscriptions, etc.), the available SDK does not expose any order or
 * subscription APIs that would let us create such dependencies. To keep the
 * test fully implementable and compilable, this scenario instead validates the
 * baseline happy path where a freshly created, unused address can be deleted
 * successfully.
 *
 * Flow:
 *
 * 1. Admin joins (registers) to obtain an authorized admin context.
 * 2. Admin logs in explicitly to exercise the login path.
 * 3. Admin creates an active country master record.
 * 4. Customer joins to obtain an authorized customer context.
 * 5. Customer logs in explicitly to exercise the customer login path.
 * 6. Customer creates a shipping address pointing to the admin-created country.
 * 7. Customer deletes the shipping address via DELETE addresses.erase.
 *
 * Assertions:
 *
 * - All non-void responses are validated with typia.assert.
 * - DELETE erase is expected to complete without throwing; no additional state
 *   inspection is possible because there is no GET/list endpoint for
 *   addresses.
 */
export async function test_api_customer_address_deletion_blocked_when_in_use_by_business_rules(
  connection: api.IConnection,
) {
  // 1. Admin joins (registration)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin logs in explicitly using the same credentials
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip ?? null,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Admin creates a country
  const countryBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.name(1),
    phone_code: "+" + typia.random<number & tags.Type<"uint32">>().toString(),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  // 4. Customer joins
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 5. Customer logs in explicitly
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: customerJoinBody.ip ?? null,
    href: customerJoinBody.href,
    referrer: customerJoinBody.referrer,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const customerId = customerAuthorized.id;

  // 6. Customer creates a shipping address referencing the created country
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    line2: null,
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const createdAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressCreateBody,
      },
    );
  typia.assert(createdAddress);

  // 7. Customer deletes the shipping address. This should succeed for a
  // freshly created, unused address.
  await api.functional.shoppingMall.customer.customers.addresses.erase(
    connection,
    {
      customerId,
      addressId: createdAddress.id,
    },
  );
}
