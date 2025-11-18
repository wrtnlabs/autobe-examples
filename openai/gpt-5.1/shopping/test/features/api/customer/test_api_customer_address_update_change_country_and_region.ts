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
 * Validate changing the country and region of an existing customer shipping
 * address.
 *
 * Business workflow covered by this test:
 *
 * 1. Register a customer and obtain their customer id.
 * 2. Register an admin and switch Authorization to admin.
 * 3. As admin, create two active countries (C1 and C2).
 * 4. As admin, create one active region under each country (R1 under C1, R2 under
 *    C2).
 * 5. Switch Authorization back to the customer via login.
 * 6. As the customer, create an address bound to country C1 and region R1.
 * 7. Update that address so that its shopping_mall_country_id points to C2 and
 *    shopping_mall_region_id points to R2, leaving all other fields unchanged.
 * 8. Verify:
 *
 *    - The address still belongs to the same customer.
 *    - The country and region foreign keys were updated to C2/R2.
 *    - The region-country linkage is consistent with how regions were created.
 *    - Created_at is unchanged while updated_at has advanced.
 *    - Is_default flag remains true when not changed by the update body.
 */
export async function test_api_customer_address_update_change_country_and_region(
  connection: api.IConnection,
) {
  // 1. Register a customer (join) and capture id
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.test`,
    password: "P@ssw0rd!", // satisfies tags.Format<"password">
    ip: null,
    href: "https://customer.test/join",
    referrer: "https://customer.test/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const joinedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(joinedCustomer);

  const customerId: string & tags.Format<"uuid"> = joinedCustomer.id;

  // 2. Register an admin and switch Authorization to admin
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: "Adm1nP@ss!",
    ip: null,
    href: "https://admin.test/join",
    referrer: "https://admin.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(joinedAdmin);

  // 3. As admin, create two countries C1 and C2
  const countryCreateBody1 = {
    country_code: RandomGenerator.alphabets(3).toUpperCase(),
    name_en: RandomGenerator.name(2),
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country1: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody1,
    });
  typia.assert(country1);

  const countryCreateBody2 = {
    country_code: RandomGenerator.alphabets(3).toUpperCase(),
    name_en: RandomGenerator.name(2),
    phone_code: "+81",
    is_active: true,
    sort_order: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country2: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody2,
    });
  typia.assert(country2);

  // 4. As admin, create one region under each country
  const regionCreateBody1 = {
    code: RandomGenerator.alphabets(4).toUpperCase(),
    name_en: RandomGenerator.name(2),
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region1: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country1.country_code,
        body: regionCreateBody1,
      },
    );
  typia.assert(region1);
  TestValidator.equals(
    "region1 belongs to country1",
    region1.country.id,
    country1.id,
  );

  const regionCreateBody2 = {
    code: RandomGenerator.alphabets(4).toUpperCase(),
    name_en: RandomGenerator.name(2),
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region2: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country2.country_code,
        body: regionCreateBody2,
      },
    );
  typia.assert(region2);
  TestValidator.equals(
    "region2 belongs to country2",
    region2.country.id,
    country2.id,
  );

  // 5. Switch back to customer via login (token swap)
  const customerLoginBody = {
    email: joinedCustomer.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.test/login",
    referrer: "https://customer.test/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const loggedInCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(loggedInCustomer);
  TestValidator.equals(
    "logged in customer id matches joined customer id",
    loggedInCustomer.id,
    customerId,
  );

  // 6. Create initial address under country1/region1
  const addressCreateBody = {
    shopping_mall_country_id: country1.id,
    shopping_mall_region_id: region1.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
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
        customerId: customerId,
        body: addressCreateBody,
      },
    );
  typia.assert(createdAddress);

  TestValidator.equals(
    "created address belongs to the customer",
    createdAddress.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.equals(
    "created address country is country1",
    createdAddress.shopping_mall_country_id,
    country1.id,
  );
  TestValidator.equals(
    "created address region is region1",
    createdAddress.shopping_mall_region_id,
    region1.id,
  );
  TestValidator.equals(
    "created address default flag is true",
    createdAddress.is_default,
    true,
  );

  const originalCreatedAt = createdAddress.created_at;
  const originalUpdatedAt = createdAddress.updated_at;

  // 7. Update address to point to country2 / region2 while keeping other fields
  const addressUpdateBody = {
    shopping_mall_country_id: country2.id,
    shopping_mall_region_id: region2.id,
    recipient_name: createdAddress.recipient_name,
    line1: createdAddress.line1,
    line2: createdAddress.line2 ?? null,
    city: createdAddress.city,
    postal_code: createdAddress.postal_code,
    phone_number: createdAddress.phone_number ?? null,
    is_default: createdAddress.is_default,
  } satisfies IShoppingMallCustomerAddress.IUpdate;

  const updatedAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.update(
      connection,
      {
        customerId: customerId,
        addressId: createdAddress.id,
        body: addressUpdateBody,
      },
    );
  typia.assert(updatedAddress);

  // 8. Validate update semantics
  TestValidator.equals(
    "updated address still belongs to same customer",
    updatedAddress.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.equals(
    "updated address country changed to country2",
    updatedAddress.shopping_mall_country_id,
    country2.id,
  );
  TestValidator.equals(
    "updated address region changed to region2",
    updatedAddress.shopping_mall_region_id,
    region2.id,
  );
  TestValidator.equals(
    "default flag remains true after update",
    updatedAddress.is_default,
    createdAddress.is_default,
  );

  TestValidator.equals(
    "created_at remains unchanged after update",
    updatedAddress.created_at,
    originalCreatedAt,
  );

  await TestValidator.predicate(
    "updated_at should be changed after update",
    async () => {
      return updatedAddress.updated_at !== originalUpdatedAt;
    },
  );
}
