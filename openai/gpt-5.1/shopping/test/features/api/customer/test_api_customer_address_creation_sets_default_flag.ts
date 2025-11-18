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
 * Validate customer shipping address creation and default flag behavior.
 *
 * Business goal
 *
 * - Ensure that when a customer creates shipping addresses via POST
 *   /shoppingMall/customer/customers/{customerId}/addresses, the is_default
 *   flag in IShoppingMallCustomerAddress.ICreate is honored and reflected in
 *   the created IShoppingMallCustomerAddress.
 * - Verify that created address records are linked to the correct customer and
 *   country.
 *
 * Scope and constraints
 *
 * - We only have a create endpoint for addresses; there is no listing or "get by
 *   id" endpoint exposed in the provided SDK, so we cannot globally verify that
 *   only one active address per customer is marked as default.
 * - Instead, we validate observable behavior per creation call:
 *
 *   1. When is_default is explicitly true, the response has is_default === true.
 *   2. When is_default is omitted, the response has is_default === false.
 *   3. The returned shopping_mall_customer_id and shopping_mall_country_id match the
 *        requested customer and country.
 *
 * Test flow
 *
 * 1. Admin join and create active country
 *
 *    - Call api.functional.auth.admin.join with an IShoppingMallAdminJoin.ICreate
 *         body to obtain an admin-authorized context. SDK automatically wires
 *         the access token into connection.headers.Authorization for subsequent
 *         calls.
 *    - Call api.functional.shoppingMall.admin.countries.create with a
 *         IShoppingMallCountry.ICreate body to insert an active country master
 *         record. Capture the returned IShoppingMallCountry.id.
 * 2. Customer join
 *
 *    - Call api.functional.auth.customer.join with
 *         IShoppingMallCustomerJoin.IRequest to create and authenticate a
 *         customer account. Capture its id as customerId for use as the path
 *         parameter in address creation.
 * 3. First address: default address creation
 *
 *    - Invoke api.functional.shoppingMall.customer.customers.addresses.create with:
 *         customerId: customer.id body: IShoppingMallCustomerAddress.ICreate
 *         where: shopping_mall_country_id: country.id recipient_name, line1,
 *         city, postal_code: realistic strings line2, phone_number: populated
 *         is_default: true
 *    - Assert:
 *
 *         - Typia.assert on the response structure.
 *         - Shopping_mall_customer_id === customer.id
 *         - Shopping_mall_country_id === country.id
 *         - Is_default === true
 * 4. Second address: non-default address creation
 *
 *    - Call addresses.create again for the same customer with:
 *
 *         - Same shopping_mall_country_id
 *         - Different address fields
 *         - Is_default omitted from the body
 *    - Assert:
 *
 *         - Typia.assert on the response
 *         - Ownership and country linkage as above
 *         - Is_default === false to confirm that omitting the flag yields a non-default
 *                   address.
 * 5. Third address: another default address
 *
 *    - Call addresses.create a third time with is_default: true.
 *    - Assert that the new address:
 *
 *         - Is structurally valid (typia.assert)
 *         - Belongs to the same customer and country
 *         - Has is_default === true.
 * 6. Business rule notes
 *
 *    - Because no list or read endpoint for addresses is provided, this test does
 *         not attempt to assert system-wide uniqueness of the default address
 *         per customer. It limits verification to per-call invariants that are
 *         observable from IShoppingMallCustomerAddress returned by each create
 *         operation.
 */
export async function test_api_customer_address_creation_sets_default_flag(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an admin-authenticated context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.test/join",
    referrer: "https://admin.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Admin creates an active country master record
  const countryCreateBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  // 3. Customer join to obtain a customerId and authenticated context
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.test`,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://shop.test/join",
    referrer: "https://shop.test/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  const customerId: string & tags.Format<"uuid"> = customerAuthorized.id;

  // 4. First address: explicitly marked as default
  const firstAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: "Apt 101",
    city: "Seoul",
    postal_code: "06236",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const firstAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: firstAddressBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(firstAddress);

  // Validate ownership, country linkage, and default flag
  TestValidator.equals(
    "first address belongs to the joined customer",
    firstAddress.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.equals(
    "first address country matches created country",
    firstAddress.shopping_mall_country_id,
    country.id,
  );
  TestValidator.equals(
    "first address is marked as default when requested",
    firstAddress.is_default,
    true,
  );

  // 5. Second address: is_default omitted (should become non-default)
  const secondAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: "Suite 202",
    city: "Busan",
    postal_code: "48058",
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const secondAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: secondAddressBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(secondAddress);

  TestValidator.equals(
    "second address belongs to the same customer",
    secondAddress.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.equals(
    "second address country matches created country",
    secondAddress.shopping_mall_country_id,
    country.id,
  );
  TestValidator.equals(
    "second address is non-default when is_default is omitted",
    secondAddress.is_default,
    false,
  );

  // 6. Third address: explicitly marked as default again
  const thirdAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: "3F",
    city: "Incheon",
    postal_code: "22382",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const thirdAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: thirdAddressBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(thirdAddress);

  TestValidator.equals(
    "third address belongs to the same customer",
    thirdAddress.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.equals(
    "third address country matches created country",
    thirdAddress.shopping_mall_country_id,
    country.id,
  );
  TestValidator.equals(
    "third address is marked as default when requested",
    thirdAddress.is_default,
    true,
  );
}
