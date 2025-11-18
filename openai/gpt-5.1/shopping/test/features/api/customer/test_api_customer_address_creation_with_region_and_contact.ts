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
 * Validate creation of a customer shipping address with linked country/region
 * master data and optional contact fields.
 *
 * Business flow:
 *
 * 1. Admin joins and logs in to obtain admin authorization context.
 * 2. Admin creates an active country in shopping_mall_countries.
 * 3. Admin creates an active region under that country using its country_code.
 * 4. Customer joins (self-registration) to obtain an authenticated customer
 *    context and customerId.
 * 5. Customer creates a shipping address under their own customerId using
 *    IShoppingMallCustomerAddress.ICreate, referencing the created country and
 *    region and populating optional fields line2 and phone_number as non-null
 *    values, with is_default=false.
 * 6. Validate that the response is a full IShoppingMallCustomerAddress, that
 *    relational IDs match the created masters and owner, and that all
 *    address/contact fields are persisted as sent, with is_default=false.
 */
export async function test_api_customer_address_creation_with_region_and_contact(
  connection: api.IConnection,
) {
  // 1. Admin joins to create an admin actor and establish admin tokens
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates an active country
  const countryCode: string = RandomGenerator.alphaNumeric(3).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.name(2),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  TestValidator.equals(
    "country_code must match created payload",
    country.country_code,
    countryCode,
  );
  TestValidator.predicate("country must be active", country.is_active === true);

  // 3. Admin creates an active region under that country
  const regionCode: string = RandomGenerator.alphaNumeric(4).toUpperCase();
  const regionCreateBody = {
    code: regionCode,
    name_en: RandomGenerator.name(2),
    region_type: "state",
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  TestValidator.equals(
    "region.country.id must match created country.id",
    region.country.id,
    country.id,
  );
  TestValidator.equals(
    "region.code must match payload",
    region.code,
    regionCode,
  );
  TestValidator.predicate("region must be active", region.is_active === true);

  // 4. Customer joins to obtain authenticated customer context
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerId: string & tags.Format<"uuid"> = customerAuth.id;

  // 5. Customer creates a shipping address referencing country and region
  const recipientName: string = RandomGenerator.name(2);
  const line1: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });
  const line2: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const city: string = RandomGenerator.name(1);
  const postalCode: string = RandomGenerator.alphaNumeric(6).toUpperCase();
  const phoneNumber: string = RandomGenerator.mobile();

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: recipientName,
    line1,
    line2,
    city,
    postal_code: postalCode,
    phone_number: phoneNumber,
    is_default: false,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressCreateBody,
      },
    );
  typia.assert(address);

  // 6. Validate relational integrity and persistence of fields
  TestValidator.equals(
    "address.customer ownership must match authenticated customer",
    address.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.equals(
    "address.shopping_mall_country_id must match created country",
    address.shopping_mall_country_id,
    country.id,
  );
  TestValidator.equals(
    "address.shopping_mall_region_id must match created region",
    address.shopping_mall_region_id,
    region.id,
  );
  TestValidator.equals(
    "recipient_name must be persisted as sent",
    address.recipient_name,
    recipientName,
  );
  TestValidator.equals("line1 must be persisted as sent", address.line1, line1);
  TestValidator.equals("line2 must be persisted as sent", address.line2, line2);
  TestValidator.equals("city must be persisted as sent", address.city, city);
  TestValidator.equals(
    "postal_code must be persisted as sent",
    address.postal_code,
    postalCode,
  );
  TestValidator.equals(
    "phone_number must be persisted as sent",
    address.phone_number,
    phoneNumber,
  );
  TestValidator.predicate(
    "is_default must be false on created address",
    address.is_default === false,
  );

  // Timestamps are structurally validated by typia.assert above; ensure they exist
  TestValidator.predicate(
    "created_at must be a non-empty string",
    typeof address.created_at === "string" && address.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty string",
    typeof address.updated_at === "string" && address.updated_at.length > 0,
  );
}
