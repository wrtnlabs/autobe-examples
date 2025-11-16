import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validates that a customer can retrieve their own address detail record using
 * the GET /shoppingMall/customer/customers/{customerId}/addresses/{addressId}
 * endpoint.
 *
 * 1. Register a new customer via join API (POST /auth/customer/join).
 * 2. (No address creation endpoint exposed—simulate address knowledge or assume an
 *    address assigned in the join step.)
 * 3. Obtain the customer ID from the join result.
 * 4. Call the address retrieval endpoint (GET
 *    /shoppingMall/customer/customers/{customerId}/addresses/{addressId}) using
 *    a test/stub address ID (simulate ownership).
 * 5. Assert the returned IShoppingMallAddress matches the schema and is linked to
 *    the correct customer ID.
 */
export async function test_api_customer_get_own_address_details_success(
  connection: api.IConnection,
) {
  // Step 1: Register as customer
  const input = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: input,
  });
  typia.assert(customer);

  // Step 2: (In absence of an address create endpoint), simulate address creation/knowledge.
  // -- Generate matching test address for this customer.
  // -- Manually construct a new IShoppingMallAddress with the correct customerId for test.
  const address: IShoppingMallAddress = {
    id: typia.random<string & tags.Format<"uuid">>(),
    full_name: customer.name,
    street: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 12,
    }),
    city: RandomGenerator.name(1),
    province: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 10,
    }),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    phone: customer.phone,
    is_default: true,
    created_at: new Date().toISOString(),
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: null,
  };
  // Step 3: Retrieve the address via the detail endpoint.
  const retrieved =
    await api.functional.shoppingMall.customer.customers.addresses.at(
      connection,
      {
        customerId: customer.id,
        addressId: address.id,
      },
    );
  typia.assert(retrieved);
  // Step 4: Validate linkage and structure.
  TestValidator.equals(
    "retrieved address is linked to customer",
    retrieved.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "retrieved address matches expected fields",
    typeof retrieved.full_name === "string" &&
      typeof retrieved.city === "string" &&
      typeof retrieved.street === "string" &&
      typeof retrieved.postal_code === "string" &&
      typeof retrieved.country === "string" &&
      typeof retrieved.phone === "string" &&
      typeof retrieved.province === "string" &&
      typeof retrieved.is_default === "boolean" &&
      typeof retrieved.created_at === "string",
  );
  TestValidator.predicate(
    "retrieved address belongs to no seller",
    retrieved.shopping_mall_seller_id === null ||
      retrieved.shopping_mall_seller_id === undefined,
  );
}
