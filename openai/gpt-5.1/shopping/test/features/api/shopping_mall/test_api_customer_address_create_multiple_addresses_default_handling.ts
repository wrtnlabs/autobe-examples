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
 * Validate creating multiple customer shipping addresses and default-flag
 * behaviour.
 *
 * Business flow:
 *
 * 1. Admin joins and creates an active country master.
 * 2. Customer joins and becomes the owner of an address book.
 * 3. Customer creates a first shipping address with is_default=true.
 * 4. Customer creates a second shipping address for the same country with
 *    is_default=true.
 * 5. Verify ownership, country linkage, id distinctness, and that at least one of
 *    the two addresses is marked as default.
 *
 * Due to absence of read/list APIs for addresses, we assert a weaker default
 * behaviour invariant based solely on the two create responses: at least one of
 * them must have is_default === true after creation.
 */
export async function test_api_customer_address_create_multiple_addresses_default_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins (creates an authorized admin context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Admin creates a country master
  const countryCreateBody = {
    country_code: `KR-${RandomGenerator.alphaNumeric(4)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+82",
    is_active: true,
    sort_order: 1 satisfies number,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  // 3. Customer joins and becomes address owner
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  const customerId: string & tags.Format<"uuid"> = customer.id;

  // 4. Customer creates first default address
  const firstAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: null,
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphabets(5),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const address1: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: firstAddressBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(address1);

  TestValidator.equals(
    "first address should belong to the joined customer",
    address1.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.equals(
    "first address should link to created country",
    address1.shopping_mall_country_id,
    country.id,
  );
  TestValidator.predicate(
    "first address is_default flag should be true",
    address1.is_default === true,
  );

  // 5. Customer creates second address also requested as default
  const secondAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: null,
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphabets(5),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const address2: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: secondAddressBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(address2);

  TestValidator.equals(
    "second address should belong to the same customer",
    address2.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.equals(
    "second address should link to the same country",
    address2.shopping_mall_country_id,
    country.id,
  );

  // 6. Cross-address invariants
  TestValidator.notEquals(
    "each created address must have a distinct id",
    address1.id,
    address2.id,
  );

  TestValidator.predicate(
    "at least one of the created addresses must be default",
    address1.is_default === true || address2.is_default === true,
  );
}
