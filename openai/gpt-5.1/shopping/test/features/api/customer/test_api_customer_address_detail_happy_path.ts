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
 * Happy path: a customer can retrieve full details of one of their own shipping
 * addresses after it has been created.
 *
 * Business flow:
 *
 * 1. Register a new customer to obtain a customer id (via /auth/customer/join).
 * 2. Register a new admin to be able to create geography masters.
 * 3. As admin, create a country and a region belonging to that country.
 * 4. Switch back to the customer actor using customer login.
 * 5. As that customer, create a new shipping address that references the created
 *    country and region.
 * 6. Retrieve the address detail via GET
 *    /shoppingMall/customer/customers/{customerId}/addresses/{addressId}.
 * 7. Verify that the retrieved address matches what was created, foreign keys are
 *    wired correctly, and lifecycle timestamps are populated with deleted_at
 *    remaining null.
 */
export async function test_api_customer_address_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a new customer (initial token will be overwritten later).
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const joinedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(joinedCustomer);

  const customerId = joinedCustomer.id;

  // 2. Register an admin actor for geography configuration.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 3. As admin, create a country and a region.
  const countryCreateBody = {
    country_code: `C${RandomGenerator.alphaNumeric(5)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: `R${RandomGenerator.alphaNumeric(5)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 4. Switch back to the customer actor via explicit login so that
  //    subsequent address operations are authenticated as this customer.
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuth);

  // Sanity check: customer id must be consistent across join and login.
  TestValidator.equals(
    "customer id should be stable between join and login",
    customerAuth.id,
    customerId,
  );

  // 5. As this customer, create a new shipping address.
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.paragraph({ sentences: 2 }),
    postal_code: RandomGenerator.alphaNumeric(8),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const createdAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressCreateBody,
      },
    );
  typia.assert(createdAddress);

  const addressId = createdAddress.id;

  // 6. Retrieve the address detail using the same customer context.
  const fetchedAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.at(
      connection,
      {
        customerId,
        addressId,
      },
    );
  typia.assert(fetchedAddress);

  // 7. Validate identity and ownership relationships.
  TestValidator.equals(
    "fetched address id should match created address id",
    fetchedAddress.id,
    addressId,
  );

  TestValidator.equals(
    "fetched address should belong to the same customer",
    fetchedAddress.shopping_mall_customer_id,
    customerId,
  );

  TestValidator.equals(
    "country fk should match created country id",
    fetchedAddress.shopping_mall_country_id,
    country.id,
  );

  TestValidator.equals(
    "region fk should match created region id",
    fetchedAddress.shopping_mall_region_id,
    region.id,
  );

  // 8. Validate business fields match the creation payload.
  TestValidator.equals(
    "recipient_name should be preserved",
    fetchedAddress.recipient_name,
    addressCreateBody.recipient_name,
  );

  TestValidator.equals(
    "line1 should be preserved",
    fetchedAddress.line1,
    addressCreateBody.line1,
  );

  TestValidator.equals(
    "line2 should be preserved",
    fetchedAddress.line2,
    addressCreateBody.line2,
  );

  TestValidator.equals(
    "city should be preserved",
    fetchedAddress.city,
    addressCreateBody.city,
  );

  TestValidator.equals(
    "postal_code should be preserved",
    fetchedAddress.postal_code,
    addressCreateBody.postal_code,
  );

  TestValidator.equals(
    "phone_number should be preserved",
    fetchedAddress.phone_number,
    addressCreateBody.phone_number,
  );

  TestValidator.equals(
    "is_default flag should be preserved",
    fetchedAddress.is_default,
    addressCreateBody.is_default,
  );

  // 9. Lifecycle validations: created_at/updated_at present, deleted_at null.
  TestValidator.predicate(
    "created_at must be a non-empty string",
    fetchedAddress.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at must be a non-empty string",
    fetchedAddress.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at must be null for active address",
    fetchedAddress.deleted_at === null ||
      fetchedAddress.deleted_at === undefined,
  );
}
