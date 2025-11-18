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
 * Ensure a customer cannot delete another customer's shipping address.
 *
 * Business workflow:
 *
 * 1. Register Customer A and obtain its authorized context.
 * 2. Register Customer B and obtain its authorized context.
 * 3. Register an Admin and login as that admin.
 * 4. As Admin, create an active country that can be referenced by customer
 *    addresses.
 * 5. Switch authentication to Customer A.
 * 6. As Customer A, create a shipping address using the country created by Admin.
 * 7. Switch authentication to Customer B.
 * 8. As Customer B, attempt to delete Customer A's address by calling DELETE
 *    /shoppingMall/customer/customers/{customerIdB}/addresses/{addressIdA}.
 * 9. Verify the unauthorized delete attempt fails by asserting that the erase call
 *    throws an error.
 *
 * Notes:
 *
 * - We do not have an API to re-fetch or list addresses, so we only validate the
 *   authorization failure of the non-owner delete attempt, not the continued
 *   existence of the address.
 * - Authentication tokens are managed by the SDK; we only call join/login APIs to
 *   switch identities.
 */
export async function test_api_customer_address_deletion_for_non_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Register Customer A
  const customerAJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinRequest,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerA);

  // 2. Register Customer B
  const customerBJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinRequest,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerB);

  // 3. Register an Admin
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. As Admin, create an active country
  const countryCreateRequest = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: RandomGenerator.mobile().slice(0, 4),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateRequest,
    });
  typia.assert<IShoppingMallCountry>(country);

  // 5. Switch authentication to Customer A via login (to emulate real flows)
  const customerALoginRequest = {
    email: customerA.email,
    password: customerAJoinRequest.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerALogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginRequest,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerALogin);

  // 6. As Customer A, create a shipping address
  const addressCreateRequest = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: null,
    city: RandomGenerator.paragraph({ sentences: 2 }),
    postal_code: RandomGenerator.alphabets(6),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const addressA: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerA.id,
        body: addressCreateRequest,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(addressA);

  // 7. Switch authentication to Customer B via login
  const customerBLoginRequest = {
    email: customerB.email,
    password: customerBJoinRequest.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerBLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginRequest,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBLogin);

  // 8. As Customer B, attempt to delete Customer A's address
  await TestValidator.error(
    "non-owner customer cannot delete another customer's address",
    async () => {
      await api.functional.shoppingMall.customer.customers.addresses.erase(
        connection,
        {
          customerId: customerBLogin.id,
          addressId: addressA.id,
        },
      );
    },
  );
}
