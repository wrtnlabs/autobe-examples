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
 * Verify that a customer can clear nullable optional address fields using the
 * update API.
 *
 * Business steps:
 *
 * 1. Admin joins and logs in (via auth.admin.join which also sets the
 *    Authorization header).
 * 2. Admin creates a country and a region under that country.
 * 3. Customer joins and logs in (via auth.customer.join which also sets the
 *    Authorization header).
 * 4. Customer creates an address with non-null optional fields (region, line2,
 *    phone_number).
 * 5. Customer updates the address, setting those optional fields explicitly to
 *    null via IShoppingMallCustomerAddress.IUpdate.
 * 6. Validate that the updated address has cleared fields, unchanged required
 *    fields, consistent ownership, and updated timestamps.
 */
export async function test_api_customer_address_update_clear_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates a country
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.name(2),
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 3. Admin creates a region under that country
  const regionCreateBody = {
    code: RandomGenerator.alphabets(5),
    name_en: RandomGenerator.name(2),
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
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

  // 4. Customer joins
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId = customerAuthorized.id;

  // 5. Customer creates an address with optional fields populated
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: `${RandomGenerator.alphabets(5)} Street 123`,
    line2: "Apt 101",
    city: "Seoul",
    postal_code: "06236",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const created: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressCreateBody,
      },
    );
  typia.assert(created);

  // 6. Customer updates the address to clear optional fields by setting them to null
  const updateBody = {
    shopping_mall_region_id: null,
    line2: null,
    phone_number: null,
  } satisfies IShoppingMallCustomerAddress.IUpdate;

  const updated: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.update(
      connection,
      {
        customerId,
        addressId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 7. Business validations
  TestValidator.equals("line2 cleared to null", updated.line2, null);
  TestValidator.equals(
    "phone_number cleared to null",
    updated.phone_number,
    null,
  );
  TestValidator.equals(
    "region id cleared to null",
    updated.shopping_mall_region_id,
    null,
  );

  TestValidator.equals(
    "unchanged country id",
    updated.shopping_mall_country_id,
    created.shopping_mall_country_id,
  );
  TestValidator.equals(
    "unchanged recipient_name",
    updated.recipient_name,
    created.recipient_name,
  );
  TestValidator.equals("unchanged line1", updated.line1, created.line1);
  TestValidator.equals("unchanged city", updated.city, created.city);
  TestValidator.equals(
    "unchanged postal_code",
    updated.postal_code,
    created.postal_code,
  );

  TestValidator.equals(
    "address still belongs to same customer id",
    updated.shopping_mall_customer_id,
    created.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "address customer id equals authenticated customer id",
    updated.shopping_mall_customer_id,
    customerId,
  );

  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    created.created_at,
  );
  TestValidator.notEquals(
    "updated_at advanced",
    updated.updated_at,
    created.updated_at,
  );

  TestValidator.equals("address not soft deleted", updated.deleted_at, null);
}
