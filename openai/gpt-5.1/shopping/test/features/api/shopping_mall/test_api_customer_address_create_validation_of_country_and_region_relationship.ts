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
 * Validate that customer address creation enforces country/region consistency.
 *
 * Business scenario:
 *
 * - A region belongs to a specific country in master data.
 * - When a customer creates an address and specifies both country and region, the
 *   backend must ensure that the chosen region actually belongs to the selected
 *   country.
 *
 * Test workflow:
 *
 * 1. Register and authenticate a customer.
 * 2. Register and authenticate an admin.
 * 3. As admin, create two different countries (A and B).
 * 4. As admin, create a region under country A.
 * 5. Switch back to customer authentication.
 * 6. Attempt to create an address for the customer where:
 *
 *    - Shopping_mall_country_id = country B.id
 *    - Shopping_mall_region_id = region from country A
 * 7. Expect the address creation to fail (business validation error).
 */
export async function test_api_customer_address_create_validation_of_country_and_region_relationship(
  connection: api.IConnection,
) {
  // 1. Register a customer (join immediately authenticates and sets token)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerJoin);

  const customerId: string & tags.Format<"uuid"> = customerJoin.id;

  // 2. Register an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 3. Admin login to ensure admin context is active
  const adminLoginBody = {
    email: adminJoin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 4. Create two countries A and B
  const countryABody = {
    country_code: `CTY-${RandomGenerator.alphaNumeric(6)}`,
    name_en: RandomGenerator.name(2),
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const countryA: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryABody,
    });
  typia.assert(countryA);

  const countryBBody = {
    country_code: `CTY-${RandomGenerator.alphaNumeric(6)}`,
    name_en: RandomGenerator.name(2),
    phone_code: "+81",
    is_active: true,
    sort_order: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const countryB: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBBody,
    });
  typia.assert(countryB);

  // 5. Create a region under country A
  const regionABody = {
    code: `RG-${RandomGenerator.alphaNumeric(4)}`,
    name_en: RandomGenerator.name(2),
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const regionA: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryA.country_code,
        body: regionABody,
      },
    );
  typia.assert(regionA);

  // 6. Switch back to customer authentication using login
  const customerLoginBody = {
    email: customerJoin.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 7. Attempt invalid address creation: country B + region from country A
  const invalidAddressBody = {
    shopping_mall_country_id: countryB.id,
    shopping_mall_region_id: regionA.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: null,
    city: "Seoul",
    postal_code: "06236",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  await TestValidator.error(
    "region must belong to selected country",
    async () => {
      await api.functional.shoppingMall.customer.customers.addresses.create(
        connection,
        {
          customerId: customerId,
          body: invalidAddressBody,
        },
      );
    },
  );
}
