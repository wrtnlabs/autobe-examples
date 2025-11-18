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
 * Validate minimal-field creation of a customer shipping address.
 *
 * This E2E test walks through a realistic workflow to verify that a newly
 * registered customer can create a shipping address using only the minimal
 * required fields, and that the backend correctly persists and returns those
 * values while applying defaulting rules.
 *
 * Business steps:
 *
 * 1. Register a new customer via /auth/customer/join to obtain an authorized
 *    customer context and id.
 * 2. Register and log in an admin, then create a country master record via
 *    /shoppingMall/admin/countries so we have a valid shopping_mall_country_id
 *    to reference from the address.
 * 3. Switch authentication back to the customer via /auth/customer/login.
 * 4. Call POST /shoppingMall/customer/customers/{customerId}/addresses with a body
 *    that contains only the minimal required fields of
 *    IShoppingMallCustomerAddress.ICreate.
 * 5. Validate that the created IShoppingMallCustomerAddress is linked to the
 *    correct customer and country, that optional fields are unset, that
 *    `is_default` is true (for the first address), and that lifecycle
 *    timestamps are populated.
 */
export async function test_api_customer_address_create_minimal_required_fields(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join)
  const customerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(12)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const joinedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(joinedCustomer);

  const customerId: string & tags.Format<"uuid"> = joinedCustomer.id;

  // 2. Admin join and login, then create a country
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(12)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const countryCreateBody = {
    country_code: RandomGenerator.alphaNumeric(3).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 3. Switch auth back to the customer via login
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  TestValidator.equals(
    "logged-in customer id should match joined customer id",
    customerLoggedIn.id,
    customerId,
  );

  // 4. Create a customer address with only minimal required fields
  const minimalAddressBody = {
    shopping_mall_country_id: country.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.paragraph({ sentences: 2 }),
    postal_code: RandomGenerator.alphaNumeric(6),
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const createdAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: minimalAddressBody,
      },
    );
  typia.assert(createdAddress);

  // 5. Business validations
  // Ensure ownership linkage
  TestValidator.equals(
    "address is linked to correct customer",
    createdAddress.shopping_mall_customer_id,
    customerId,
  );

  // Ensure country linkage and persisted fields
  TestValidator.equals(
    "address country id matches created country",
    createdAddress.shopping_mall_country_id,
    country.id,
  );

  TestValidator.equals(
    "recipient_name is persisted",
    createdAddress.recipient_name,
    minimalAddressBody.recipient_name,
  );

  TestValidator.equals(
    "line1 is persisted",
    createdAddress.line1,
    minimalAddressBody.line1,
  );

  TestValidator.equals(
    "city is persisted",
    createdAddress.city,
    minimalAddressBody.city,
  );

  TestValidator.equals(
    "postal_code is persisted",
    createdAddress.postal_code,
    minimalAddressBody.postal_code,
  );

  // Optional fields should remain unset (null or undefined)
  TestValidator.predicate(
    "shopping_mall_region_id should be null or undefined when omitted",
    createdAddress.shopping_mall_region_id === null ||
      createdAddress.shopping_mall_region_id === undefined,
  );

  TestValidator.predicate(
    "line2 should be null or undefined when omitted",
    createdAddress.line2 === null || createdAddress.line2 === undefined,
  );

  TestValidator.predicate(
    "phone_number should be null or undefined when omitted",
    createdAddress.phone_number === null ||
      createdAddress.phone_number === undefined,
  );

  // is_default should be true for the first address
  TestValidator.predicate(
    "first created address should be default",
    createdAddress.is_default === true,
  );

  // Timestamps should be non-empty strings (typia.assert already validated format)
  TestValidator.predicate(
    "created_at is non-empty",
    typeof createdAddress.created_at === "string" &&
      createdAddress.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at is non-empty",
    typeof createdAddress.updated_at === "string" &&
      createdAddress.updated_at.length > 0,
  );
}
