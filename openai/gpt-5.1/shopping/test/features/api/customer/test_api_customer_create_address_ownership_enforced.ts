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
 * Verify that customer shipping address creation is ownership-enforced.
 *
 * Business goal: Ensure that the POST
 * /shoppingMall/customer/customers/{customerId}/addresses endpoint only allows
 * the authenticated customer to create addresses for their own account. A
 * different authenticated customer attempting to create an address under
 * another customer's ID must fail, while the legitimate owner must succeed with
 * the same kind of payload.
 *
 * End-to-end flow:
 *
 * 1. Create Customer A via /auth/customer/join and capture customerIdA.
 * 2. Create Customer B via /auth/customer/join and capture customerIdB.
 *
 *    - After this join call, the connection will be authenticated as Customer B (SDK
 *         sets Authorization automatically).
 * 3. Create an Admin via /auth/admin/join.
 *
 *    - This switches the connection auth context to the new admin user.
 * 4. As Admin, create a Country via /shoppingMall/admin/countries with a valid
 *    IShoppingMallCountry.ICreate body and capture its id.
 * 5. Re-authenticate as Customer B using /auth/customer/login so that the
 *    connection represents Customer B again.
 * 6. Attempt to create a shipping address for Customer A by calling
 *    /shoppingMall/customer/customers/{customerIdA}/addresses as Customer B,
 *    providing a fully valid IShoppingMallCustomerAddress.ICreate body that
 *    references the created country id.
 *
 *    - Expectation: The call must fail due to ownership/authorization (exact HTTP
 *         status is not asserted; we only assert that an error is thrown).
 * 7. Switch authentication to Customer A using /auth/customer/login.
 * 8. Call the same address creation endpoint again for customerIdA with a valid
 *    IShoppingMallCustomerAddress.ICreate body.
 *
 *    - Expectation: The call must succeed, returning a IShoppingMallCustomerAddress
 *         object.
 * 9. Validate the success response:
 *
 *    - Use typia.assert() to ensure the response structure matches the
 *         IShoppingMallCustomerAddress type.
 *    - Using TestValidator, assert that:
 *
 *         - Shopping_mall_customer_id equals customerIdA.
 *         - Shopping_mall_country_id equals the country id we created.
 *
 * Negative scope:
 *
 * - Do not attempt to validate HTTP status codes (403/404/etc.). Only assert that
 *   an error is thrown for the unauthorized attempt.
 * - Do not perform schema/type violation tests (no wrong types or missing
 *   required fields).
 * - Do not manipulate connection.headers manually; rely entirely on the SDK
 *   authentication helpers (join/login) to manage Authorization.
 */
export async function test_api_customer_create_address_ownership_enforced(
  connection: api.IConnection,
) {
  // 1. Register Customer A
  const customerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer-a.join/",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerA);

  const customerIdA: string & tags.Format<"uuid"> = customerA.id;

  // 2. Register Customer B (connection becomes authenticated as B)
  const customerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer-b.join/",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerB);

  const customerIdB: string & tags.Format<"uuid"> = customerB.id;
  TestValidator.predicate(
    "customer A and B must be different accounts",
    customerIdA !== customerIdB,
  );

  // 3. Register an admin (switch auth context to admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.join/",
    referrer: "https://admin.landing.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 4. As Admin, create a country master record
  const countryCreateBody = {
    country_code: `CTRY-${RandomGenerator.alphabets(3).toUpperCase()}`,
    name_en: `Country ${RandomGenerator.name(1)}`,
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const countryId: string & tags.Format<"uuid"> = country.id;

  // 5. Re-authenticate as Customer B
  const customerBLoginBody = {
    email: customerB.email,
    password: customerBJoinBody.password,
    ip: null,
    href: "https://customer-b.login/",
    referrer: "https://login.landing.example.com/",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerBAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert(customerBAuthorized);

  TestValidator.equals(
    "login as customer B should return the same id as join",
    customerBAuthorized.id,
    customerIdB,
  );

  // Common address payload factory
  const buildAddressCreateBody = () => {
    const line1 = `${RandomGenerator.alphabets(5)} Street 123`;
    const city = "Seoul";
    const postal = "06000";

    return {
      shopping_mall_country_id: countryId,
      shopping_mall_region_id: null,
      recipient_name: RandomGenerator.name(1),
      line1,
      line2: "Apt 101",
      city,
      postal_code: postal,
      phone_number: RandomGenerator.mobile(),
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate;
  };

  const unauthorizedAddressBody = buildAddressCreateBody();

  // 6. Attempt to create address for Customer A while authenticated as B
  await TestValidator.error(
    "customer B must not be allowed to create address for customer A",
    async () => {
      await api.functional.shoppingMall.customer.customers.addresses.create(
        connection,
        {
          customerId: customerIdA,
          body: unauthorizedAddressBody,
        },
      );
    },
  );

  // 7. Switch authentication to Customer A
  const customerALoginBody = {
    email: customerA.email,
    password: customerAJoinBody.password,
    ip: null,
    href: "https://customer-a.login/",
    referrer: "https://login.landing.example.com/",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerAAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert(customerAAuthorized);

  TestValidator.equals(
    "login as customer A should return the same id as join",
    customerAAuthorized.id,
    customerIdA,
  );

  // 8. Create an address for Customer A as Customer A
  const authorizedAddressBody = buildAddressCreateBody();

  const createdAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerIdA,
        body: authorizedAddressBody,
      },
    );
  typia.assert(createdAddress);

  // 9. Business-level validations
  TestValidator.equals(
    "created address must belong to customer A",
    createdAddress.shopping_mall_customer_id,
    customerIdA,
  );

  TestValidator.equals(
    "created address must reference the created country",
    createdAddress.shopping_mall_country_id,
    countryId,
  );

  TestValidator.predicate(
    "created address should be marked as default",
    createdAddress.is_default === true,
  );
}
