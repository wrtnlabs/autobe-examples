import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

/**
 * Validate that customer address creation is rejected when using a non-existent
 * country.
 *
 * Business goal: Ensure that the address creation endpoint enforces referential
 * integrity to the `shopping_mall_countries` master table by rejecting
 * addresses that reference a country id that does not exist, while still
 * accepting otherwise valid address payloads.
 *
 * Flow:
 *
 * 1. Register a new customer using the join endpoint, capturing the returned
 *    authorized customer payload.
 * 2. As that authenticated customer, attempt to create a new shipping address with
 *    IShoppingMallCustomerAddress.ICreate, but set `shopping_mall_country_id`
 *    to a clearly invalid UUID (e.g., a fixed all-zero UUID) that is unlikely
 *    to exist in the master data.
 * 3. Expect the address creation call to fail; validate this using
 *    TestValidator.error with a descriptive title.
 * 4. Optionally, create a second address using a random valid-looking UUID for
 *    `shopping_mall_country_id` to demonstrate that structurally valid payloads
 *    succeed when country constraints are satisfied (in simulation this will
 *    always succeed; in a real backend this assumes presence of some
 *    corresponding country row).
 *
 * Notes:
 *
 * - Do not assert on specific HTTP status codes or error message contents.
 * - Do not deliberately violate DTO type contracts; all payloads must match their
 *   DTO types exactly.
 * - Do not manipulate connection.headers directly; rely on the SDK to propagate
 *   authentication state from the join call.
 */
export async function test_api_customer_address_creation_rejects_invalid_country(
  connection: api.IConnection,
) {
  // 1. Register a new customer via /auth/customer/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(customer);

  const customerId: string & tags.Format<"uuid"> = customer.id;

  // 2. Attempt to create address with invalid/non-existent country id
  const invalidCountryId = typia.assert<string & tags.Format<"uuid">>(
    "00000000-0000-0000-0000-000000000000",
  );

  const invalidAddressBody = {
    shopping_mall_country_id: invalidCountryId,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    line2: null,
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphabets(5),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  await TestValidator.error(
    "address creation must fail for non-existent country id",
    async () => {
      await api.functional.shoppingMall.customer.customers.addresses.create(
        connection,
        {
          customerId,
          body: invalidAddressBody,
        },
      );
    },
  );

  // 3. Verify that the connection is still usable by creating
  //    a structurally valid address with a random UUID as country id.
  //    In simulation mode this always succeeds; in a real backend this assumes
  //    the presence of some matching country row.
  const maybeValidCountryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const validAddressBody = {
    shopping_mall_country_id: maybeValidCountryId,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    line2: null,
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphabets(5),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const createdAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: validAddressBody,
      },
    );
  typia.assert(createdAddress);

  TestValidator.equals(
    "created address belongs to the joined customer",
    createdAddress.shopping_mall_customer_id,
    customerId,
  );
}
