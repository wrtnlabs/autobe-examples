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
 * Verify that a customer can create a new shipping address bound to existing
 * country and region masters, and that authorization boundaries are enforced.
 *
 * Business flow:
 *
 * 1. Register a customer (join) and obtain their id.
 * 2. Register an admin (join) and authenticate as that admin.
 * 3. As admin, create a country master record.
 * 4. As admin, create a region under that country.
 * 5. Switch back to the customer actor (login) using the original customer
 *    credentials.
 * 6. As the customer, create a shipping address that references the created
 *    country and region.
 * 7. Validate the created address fields and relationships.
 * 8. Negative checks: ensure admin and another customer cannot create an address
 *    for the first customer.
 */
export async function test_api_customer_create_address_with_country_and_region(
  connection: api.IConnection,
) {
  // 1. Register first customer (owner of the address)
  const customerJoinBody = {
    email: `customer+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!", // satisfies password format
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  const customerId: string & tags.Format<"uuid"> = customerAuthorized.id;

  // 2. Register admin
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Adm1nP@ss!",
    ip: null,
    href: "https://shop.example.com/admin/signup",
    referrer: "https://shop.example.com/admin/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 3. As admin, create country
  const countryCreateBody = {
    country_code: RandomGenerator.alphaNumeric(2).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+1",
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  // 4. As admin, create region under country
  const regionCreateBody = {
    code: RandomGenerator.alphaNumeric(4).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    region_type: "state",
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // 5. Switch back to customer context via login (to ensure proper actor)
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLoggedIn);

  // 6. As customer, create address referencing country & region
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerId,
        body: addressCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(address);

  // 7. Positive validations
  TestValidator.equals(
    "address customer id matches owner",
    address.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.equals(
    "address country id matches created country",
    address.shopping_mall_country_id,
    country.id,
  );
  TestValidator.equals(
    "address region id matches created region",
    address.shopping_mall_region_id,
    region.id,
  );
  TestValidator.equals(
    "recipient name persisted",
    address.recipient_name,
    addressCreateBody.recipient_name,
  );
  TestValidator.equals(
    "line1 persisted",
    address.line1,
    addressCreateBody.line1,
  );
  TestValidator.equals("city persisted", address.city, addressCreateBody.city);
  TestValidator.equals(
    "postal code persisted",
    address.postal_code,
    addressCreateBody.postal_code,
  );
  TestValidator.equals(
    "phone number persisted",
    address.phone_number ?? null,
    addressCreateBody.phone_number ?? null,
  );
  TestValidator.equals("is_default is true", address.is_default, true);
  TestValidator.predicate(
    "created_at is non-empty string",
    address.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty string",
    address.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", address.deleted_at ?? null, null);

  // 8-a. Negative: admin cannot create address for customer
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://shop.example.com/admin/login",
    referrer: "https://shop.example.com/admin/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedIn);

  const adminAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  await TestValidator.error(
    "admin cannot create customer address",
    async () => {
      await api.functional.shoppingMall.customer.customers.addresses.create(
        connection,
        {
          customerId: customerId,
          body: adminAddressBody,
        },
      );
    },
  );

  // 8-b. Negative: other customer cannot create address for first customer
  const otherCustomerJoinBody = {
    email: `customer2+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const otherCustomerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: otherCustomerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(otherCustomerAuthorized);

  const otherCustomerAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  await TestValidator.error(
    "other customer cannot create address for first customer",
    async () => {
      await api.functional.shoppingMall.customer.customers.addresses.create(
        connection,
        {
          customerId: customerId,
          body: otherCustomerAddressBody,
        },
      );
    },
  );
}
