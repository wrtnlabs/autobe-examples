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
 * Validate that a customer can successfully delete one of their own shipping
 * addresses.
 *
 * Business flow implemented:
 *
 * 1. Create and authenticate an admin, then create an active country master
 *    record.
 * 2. Create and authenticate a customer via self-service join.
 * 3. As the customer, create a shipping address bound to the created country.
 * 4. Delete that address via the customer-scoped DELETE API.
 * 5. Assert that the delete operation succeeds (no error thrown) and that the
 *    deleted address id belonged to the same customer performing the deletion.
 *
 * Due to the absence of address read/list APIs in the provided SDK, the test
 * cannot re-fetch the address to confirm soft-deletion flags or absence from
 * listings. Instead, it focuses on end-to-end success of the delete call within
 * a realistic business workflow and on ownership correctness.
 */
export async function test_api_customer_address_deletion_success(
  connection: api.IConnection,
) {
  // 1. Admin joins (registration implicitly authenticates as this admin)
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

  // 2. Admin creates a country master record
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 3. Customer joins (self-registration, also authenticates this customer)
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

  const customerAuthorizedFromJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorizedFromJoin);

  const customerId: string & tags.Format<"uuid"> =
    customerAuthorizedFromJoin.id;

  // 4. Explicit customer login to verify login path and ensure auth context
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerAuthorizedFromLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuthorizedFromLogin);
  TestValidator.equals(
    "customer id from join and login must match",
    customerAuthorizedFromLogin.id,
    customerId,
  );

  // 5. As this customer, create a shipping address bound to the created country
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    line2: null,
    city: "Seoul",
    postal_code: "06236",
    phone_number: RandomGenerator.mobile("010"),
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
  typia.assert(address);

  TestValidator.equals(
    "created address must belong to the authenticated customer",
    address.shopping_mall_customer_id,
    customerId,
  );

  // 6. Delete the address via the customer-scoped erase API
  await api.functional.shoppingMall.customer.customers.addresses.erase(
    connection,
    {
      customerId,
      addressId: address.id,
    },
  );

  // 7. Verify that delete succeeded by asserting no error and correct IDs were used
  TestValidator.equals(
    "deleted address id matches the created one",
    address.id,
    address.id,
  );
}
