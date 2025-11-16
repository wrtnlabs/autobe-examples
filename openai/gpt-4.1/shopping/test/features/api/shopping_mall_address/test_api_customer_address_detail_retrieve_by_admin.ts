import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test that a platform admin can retrieve a customer's address in detail,
 * validating correct permissions and error scenarios.
 *
 * Steps:
 *
 * 1. Register a new admin to obtain admin authentication.
 * 2. Simulate existence of a customer and address (since customer/address creation
 *    APIs are not available, use random UUIDs for input, focusing solely on
 *    admin endpoint behavior).
 * 3. Attempt to retrieve an address for the given (random) customerId and
 *    addressId.
 * 4. Validate successful structure and types on successful retrieval (structure:
 *    IShoppingMallAddress).
 * 5. Attempt retrieval with mismatched fake addressId for correct customerId, and
 *    correct addressId for a fake customerId, and assert error is thrown for
 *    each invalid case (if the API allows, given domain limitations).
 *
 * Note: In a real setup, customer and customer address creation would be
 * required for authentic data. Here, random UUIDs are leveraged to test admin
 * permission and endpoint behavior in isolation.
 */
export async function test_api_customer_address_detail_retrieve_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword satisfies string as string,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Use admin credentials - attempt an address detail retrieval
  // Since we have no customer or address creation API, we use random UUIDs directly
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.admin.customers.addresses.at(connection, {
      customerId,
      addressId,
    });
  typia.assert(address);

  // 3. Confirm the returned address belongs to the queried customer
  TestValidator.equals(
    "address.customer_id matches input",
    address.shopping_mall_customer_id,
    customerId,
  );

  // 4. Confirm presence and type of all expected fields
  TestValidator.predicate(
    "address has valid full_name",
    typeof address.full_name === "string" && address.full_name.length > 0,
  );
  TestValidator.predicate(
    "address has valid street",
    typeof address.street === "string" && address.street.length > 0,
  );
  TestValidator.predicate(
    "address has valid city",
    typeof address.city === "string" && address.city.length > 0,
  );
  TestValidator.predicate(
    "address has valid province",
    typeof address.province === "string" && address.province.length > 0,
  );
  TestValidator.predicate(
    "address has valid postal_code",
    typeof address.postal_code === "string" && address.postal_code.length > 0,
  );
  TestValidator.predicate(
    "address has valid country",
    typeof address.country === "string" && address.country.length > 0,
  );
  TestValidator.predicate(
    "address has valid phone",
    typeof address.phone === "string" && address.phone.length > 0,
  );
  TestValidator.predicate(
    "address has default flag",
    typeof address.is_default === "boolean",
  );
  TestValidator.predicate(
    "address has created_at timestamp",
    typeof address.created_at === "string" && address.created_at.length > 0,
  );

  // 5. Attempt retrieval with invalid addressId (simulate not found/ownership violation)
  const fakeAddressId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin cannot retrieve address for non-matching addressId",
    async () => {
      await api.functional.shoppingMall.admin.customers.addresses.at(
        connection,
        {
          customerId,
          addressId: fakeAddressId,
        },
      );
    },
  );

  // 6. Attempt retrieval with invalid customerId (simulate not found/ownership violation)
  const fakeCustomerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin cannot retrieve address for non-matching customerId",
    async () => {
      await api.functional.shoppingMall.admin.customers.addresses.at(
        connection,
        {
          customerId: fakeCustomerId,
          addressId,
        },
      );
    },
  );
}
