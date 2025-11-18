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
 * Validate creation of a customer shipping address with country/region linkage
 * and optional fields.
 *
 * Business workflow covered by this test:
 *
 * 1. Register and authenticate a customer account (customer join).
 * 2. Register and authenticate an admin account (admin join).
 * 3. As admin, create a country master record.
 * 4. As admin, create a region under that country using its business country_code.
 * 5. Switch back to the customer context via customer login.
 * 6. As the authenticated customer, create a shipping address referencing the
 *    created country and region, filling all optional address fields and
 *    marking the address as default.
 * 7. Validate that the created address entity correctly reflects the input data
 *    and foreign key relationships.
 */
export async function test_api_customer_address_create_with_region_and_optional_fields(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join) and obtain authorized context
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  const customerId: string & tags.Format<"uuid"> = customerAuthorized.id;

  // 2. Register a new admin (join) and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 3. As admin, create a country master record
  const countryCode = `TC-${RandomGenerator.alphaNumeric(6)}`;

  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+99",
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  TestValidator.equals(
    "created country_code should match input",
    country.country_code,
    countryCode,
  );

  // 4. As admin, create a region for that country
  const regionCreateBody = {
    code: `REG-${RandomGenerator.alphaNumeric(4)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    region_type: "state",
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  TestValidator.equals(
    "region.country.id should match created country.id",
    region.country.id,
    country.id,
  );
  TestValidator.equals(
    "region.country.country_code should match created country.country_code",
    region.country.country_code,
    country.country_code,
  );

  // 5. Switch back to the customer actor using customer login
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/login-ref" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerAfterLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAfterLogin);

  TestValidator.equals(
    "customer id after login should match joined customer id",
    customerAfterLogin.id,
    customerId,
  );

  // 6. As customer, create a new address referencing country and region,
  //    filling all optional fields and marking as default
  const recipientName = RandomGenerator.name();
  const line1 = RandomGenerator.paragraph({ sentences: 3 });
  const line2 = RandomGenerator.paragraph({ sentences: 3 });
  const city = RandomGenerator.paragraph({ sentences: 2 });
  const postalCode = RandomGenerator.alphaNumeric(8);
  const phoneNumber = RandomGenerator.mobile();

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: recipientName,
    line1,
    line2,
    city,
    postal_code: postalCode,
    phone_number: phoneNumber,
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(address);

  // 7. Business assertions on created address
  TestValidator.equals(
    "address.shopping_mall_customer_id should equal authenticated customer id",
    address.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.equals(
    "address.shopping_mall_country_id should equal created country id",
    address.shopping_mall_country_id,
    country.id,
  );
  TestValidator.equals(
    "address.shopping_mall_region_id should equal created region id",
    address.shopping_mall_region_id,
    region.id,
  );
  TestValidator.equals(
    "address.recipient_name should match input",
    address.recipient_name,
    recipientName,
  );
  TestValidator.equals(
    "address.line1 should match input",
    address.line1,
    line1,
  );
  TestValidator.equals(
    "address.line2 should match input",
    address.line2,
    line2,
  );
  TestValidator.equals("address.city should match input", address.city, city);
  TestValidator.equals(
    "address.postal_code should match input",
    address.postal_code,
    postalCode,
  );
  TestValidator.equals(
    "address.phone_number should match input",
    address.phone_number,
    phoneNumber,
  );
  TestValidator.equals(
    "address.is_default should be true",
    address.is_default,
    true,
  );

  // Basic timestamp presence checks (detailed validation is already done by typia.assert)
  TestValidator.predicate(
    "address.created_at should be a non-empty string",
    address.created_at.length > 0,
  );
  TestValidator.predicate(
    "address.updated_at should be a non-empty string",
    address.updated_at.length > 0,
  );
}
