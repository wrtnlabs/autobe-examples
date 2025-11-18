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
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

/**
 * Validate creation of multiple customer addresses and observable default flag
 * behavior.
 *
 * Business scenario:
 *
 * - A customer signs up and will own multiple shipping addresses.
 * - An admin configures a country (and optionally a region) that addresses will
 *   reference.
 * - The customer then creates two addresses for the same customer, both with
 *   is_default=true in the request payload.
 *
 * Steps:
 *
 * 1. Admin join and login to obtain an authorized admin session.
 * 2. Admin creates a country master record via POST /shoppingMall/admin/countries.
 * 3. Optionally admin creates a region under that country via POST
 *    /shoppingMall/admin/countries/{countryCode}/regions.
 * 4. Customer join and login to obtain an authorized customer session and its
 *    customer id.
 * 5. Customer calls POST /shoppingMall/customer/customers/{customerId}/addresses
 *    with is_default=true to create address A.
 * 6. Customer calls POST /shoppingMall/customer/customers/{customerId}/addresses
 *    again with is_default=true to create address B.
 *
 * Validations (limited to available APIs):
 *
 * - All auth operations return IAuthorized DTOs and pass typia.assert.
 * - Country and region creations succeed and pass typia.assert; their ids are
 *   used as foreign keys in addresses.
 * - Both address creations succeed and return IShoppingMallCustomerAddress
 *   objects.
 * - AddressA.is_default is true and addressB.is_default is true from each
 *   creation response.
 * - AddressA.id and addressB.id are different values.
 * - Both addresses share the same shopping_mall_customer_id that matches the
 *   authenticated customer id.
 *
 * Note:
 *
 * - The original business rule suggests that only one default address should
 *   exist per customer and that a later default=true creation may switch the
 *   default away from earlier addresses. However, since no list/read endpoint
 *   is available in the given SDK to observe all addresses after the second
 *   creation, this test only asserts what is directly observable from the two
 *   create responses and documents the intended invariant in comments.
 */
export async function test_api_customer_create_multiple_addresses_default_switching(
  connection: api.IConnection,
) {
  // 1. Admin join: create an admin account
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedFromJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Admin login: ensure login flow also works (and refresh Authorization header)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorizedFromLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  TestValidator.equals(
    "admin id from join and login should match",
    adminAuthorizedFromJoin.id,
    adminAuthorizedFromLogin.id,
  );

  // 3. Admin creates a country master record
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: "Test Country " + RandomGenerator.paragraph({ sentences: 1 }),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1 satisfies number,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  TestValidator.equals(
    "country_code in response should match request",
    country.country_code,
    countryCreateBody.country_code,
  );

  // 4. Optionally create a region for that country
  const regionCreateBody = {
    code: "R-" + RandomGenerator.alphaNumeric(4),
    name_en: "Test Region " + RandomGenerator.paragraph({ sentences: 1 }),
    region_type: "test",
    is_active: true,
    sort_order: 1 satisfies number,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  TestValidator.equals(
    "region.country.country_code should equal parent country_code",
    region.country.country_code,
    country.country_code,
  );

  // 5. Customer join
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>() satisfies
      | string
      | null
      | undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorizedFromJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorizedFromJoin);

  // 6. Customer login (refresh Authorization header and validate flow)
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: customerJoinBody.ip ?? null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerAuthorizedFromLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuthorizedFromLogin);

  TestValidator.equals(
    "customer id from join and login should match",
    customerAuthorizedFromJoin.id,
    customerAuthorizedFromLogin.id,
  );

  const customerId = customerAuthorizedFromLogin.id;

  // 7. Customer creates first address A with is_default=true
  const addressABody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 1 }),
    line2: null,
    city: "City-" + RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const addressA: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressABody,
      },
    );
  typia.assert(addressA);

  TestValidator.equals(
    "address A belongs to the authenticated customer",
    addressA.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.equals(
    "address A is_default flag should be true",
    addressA.is_default,
    true,
  );

  // 8. Customer creates second address B with is_default=true
  const addressBBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 1 }),
    line2: null,
    city: "City-" + RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const addressB: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressBBody,
      },
    );
  typia.assert(addressB);

  TestValidator.equals(
    "address B belongs to the authenticated customer",
    addressB.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.equals(
    "address B is_default flag should be true",
    addressB.is_default,
    true,
  );

  // 9. Compare the two addresses to ensure they are distinct records
  TestValidator.notEquals(
    "address A and address B must have different ids",
    addressA.id,
    addressB.id,
  );
}
