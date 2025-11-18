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
 * Verify that requesting a non-existent customer address does not return data.
 *
 * ## Business intent
 *
 * This test ensures that the customer-scoped address detail endpoint
 * `/shoppingMall/customer/customers/{customerId}/addresses/{addressId}` behaves
 * safely when the requested addressId does not exist for the given customer.
 * The endpoint must not accidentally return an address belonging to another
 * customer and must surface an error rather than a normal
 * IShoppingMallCustomerAddress payload.
 *
 * ## Scenario outline
 *
 * 1. Register a customer account via POST /auth/customer/join.
 *
 *    - Use IShoppingMallCustomerJoin.IRequest as the body.
 *    - Capture the returned IShoppingMallCustomer.IAuthorized and its id.
 *    - The SDK will set `connection.headers.Authorization` automatically based on
 *         the returned token.
 * 2. Create at least one valid address for this customer via POST
 *    /shoppingMall/customer/customers/{customerId}/addresses.
 *
 *    - Use the joined customer.id as `customerId` path param.
 *    - Use IShoppingMallCustomerAddress.ICreate for the body, populating:
 *
 *         - Shopping_mall_country_id: a UUID string (we use typia.random)
 *         - Shopping_mall_region_id: null (explicitly) to keep things simple
 *         - Recipient_name, line1, city, postal_code: random but realistic
 *         - Line2, phone_number: optional random values or null
 *         - Is_default: true
 *    - Assert the response as IShoppingMallCustomerAddress and verify that
 *         shopping_mall_customer_id equals the authenticated customer id.
 * 3. Build a clearly non-existent addressId.
 *
 *    - Generate a random UUID string using typia.random<string &
 *         tags.Format<"uuid">>().
 *    - If by coincidence it equals the created address.id, generate again.
 *    - We do not attempt to reuse any real address ID from another customer because
 *         cross-customer data setup flows are not in scope here.
 * 4. Call the detail endpoint with the bogus addressId.
 *
 *    - Call api.functional.shoppingMall.customer.customers.addresses.at with: {
 *         customerId: customer.id, addressId: bogusId, }
 *    - Wrap this call with TestValidator.error to assert that it results in an error
 *         rather than a successful IShoppingMallCustomerAddress response. We do
 *         not assert specific HTTP status codes.
 * 5. (Optional) Try a second random bogus id to reduce flakiness.
 *
 *    - Repeat step 4 with another random UUID.
 *
 * The key guarantee is that the endpoint must _not_ return any address when the
 * addressId is not associated with the specified customerId, thereby preserving
 * tenant isolation and preventing accidental data disclosure.
 */
export async function test_api_customer_address_detail_nonexistent_address(
  connection: api.IConnection,
) {
  // 1. Register a customer and get an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  const customerId: string & tags.Format<"uuid"> = customerAuthorized.id;

  // 2. Create at least one valid address for this customer
  const addressCreateBody = {
    shopping_mall_country_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: null,
    city: RandomGenerator.name(1),
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
  typia.assert<IShoppingMallCustomerAddress>(createdAddress);

  TestValidator.equals(
    "created address is bound to the joined customer",
    createdAddress.shopping_mall_customer_id,
    customerId,
  );

  // 3. Build a bogus addressId that should not exist for this customer
  const generateBogusId = (): string & tags.Format<"uuid"> => {
    let candidate: string & tags.Format<"uuid"> = typia.random<
      string & tags.Format<"uuid">
    >();
    if (candidate === createdAddress.id) {
      candidate = typia.random<string & tags.Format<"uuid">>();
    }
    return candidate;
  };

  const bogusAddressId1 = generateBogusId();
  const bogusAddressId2 = generateBogusId();

  // 4. Verify that requesting a non-existent address results in an error
  await TestValidator.error(
    "non-existent address detail must fail for first bogus id",
    async () => {
      await api.functional.shoppingMall.customer.customers.addresses.at(
        connection,
        {
          customerId,
          addressId: bogusAddressId1,
        },
      );
    },
  );

  // 5. Optional second bogus id to reduce flakiness
  await TestValidator.error(
    "non-existent address detail must fail for second bogus id",
    async () => {
      await api.functional.shoppingMall.customer.customers.addresses.at(
        connection,
        {
          customerId,
          addressId: bogusAddressId2,
        },
      );
    },
  );
}
