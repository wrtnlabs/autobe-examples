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
 * Validate deletion behavior for non-existent customer addresses.
 *
 * This e2e scenario verifies that the customer-address deletion endpoint
 * `/shoppingMall/customer/customers/{customerId}/addresses/{addressId}`
 * correctly rejects attempts to delete an address that does not exist for the
 * authenticated customer, while leaving any existing addresses intact.
 *
 * Business flow:
 *
 * 1. Register a new customer using auth.customer.join to obtain an authenticated
 *    customer context (token is handled by SDK via connection.headers).
 * 2. Optionally register an admin, log in as admin and create a country via
 *    shoppingMall.admin.countries.create so that a valid
 *    shopping_mall_country_id exists for address creation.
 * 3. Log back in as the customer (if admin login overwrote the token), and create
 *    at least one valid address via
 *    shoppingMall.customer.customers.addresses.create so that we can later
 *    verify that a failed delete does not remove it.
 * 4. Choose an addressId that is guaranteed not to exist for this customer, e.g. a
 *    fresh random UUID that has never been used as an address id in this test,
 *    and call shoppingMall.customer.customers.addresses.erase with that id.
 * 5. Expect the erase call to fail with an HttpError (SDK throws on non-2xx). The
 *    test must use TestValidator.error with an async callback and must not
 *    attempt to check HTTP status codes or error message contents.
 * 6. After the failed delete, verify that the previously created valid address is
 *    still logically present by creating another address for the same customer
 *    and asserting that both addresses can co-exist according to the API
 *    contract. Because we have no listing endpoint in this context, the
 *    simplest invariance check is that we can still create another address
 *    without error and that its fields satisfy the DTO shape via typia.assert.
 *
 * Type and safety constraints:
 *
 * - Use typia.random with proper generic arguments for DTO creation.
 * - Use the concrete request DTO types: IShoppingMallCustomerJoin.IRequest,
 *   IShoppingMallCustomerLogin.IRequest, IShoppingMallAdminJoin.ICreate,
 *   IShoppingMallAdminLogin.ICreate, IShoppingMallCountry.ICreate,
 *   IShoppingMallCustomerAddress.ICreate.
 * - Do not send malformed bodies, omit required fields, or intentionally violate
 *   type constraints; this test is about logical not-found behavior, not type
 *   validation.
 * - All API calls must be awaited; TestValidator.error must be awaited because
 *   the callback is async.
 */
export async function test_api_customer_address_deletion_nonexistent_address(
  connection: api.IConnection,
) {
  // 1. Register customer and obtain authorized context
  const customerJoinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId: string & tags.Format<"uuid"> = customerAuthorized.id;

  // 2. Register admin and create a country, to have a valid country id
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const countryCreateBody = typia.random<IShoppingMallCountry.ICreate>();
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 3. Log back in as customer (since admin.join set admin token)
  const customerLoginBody: IShoppingMallCustomerLogin.IRequest = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: customerJoinBody.ip ?? null,
    href: customerJoinBody.href,
    referrer: customerJoinBody.referrer,
  };
  const customerReAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerReAuthorized);

  // 4. Create a real address for the customer
  const createAddressBody: IShoppingMallCustomerAddress.ICreate = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphabets(6),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  };

  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: createAddressBody,
      },
    );
  typia.assert(address);

  // 5. Attempt to delete a non-existent address for this customer
  const nonexistentAddressId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deleting non-existent address should fail",
    async () => {
      await api.functional.shoppingMall.customer.customers.addresses.erase(
        connection,
        {
          customerId,
          addressId: nonexistentAddressId,
        },
      );
    },
  );

  // 6. Verify existing data is unaffected by creating another address
  const secondAddressBody: IShoppingMallCustomerAddress.ICreate = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphabets(6),
    phone_number: RandomGenerator.mobile(),
    is_default: false,
  };

  const secondAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: secondAddressBody,
      },
    );
  typia.assert(secondAddress);

  TestValidator.predicate(
    "second address belongs to same customer",
    secondAddress.shopping_mall_customer_id === customerId,
  );
}
