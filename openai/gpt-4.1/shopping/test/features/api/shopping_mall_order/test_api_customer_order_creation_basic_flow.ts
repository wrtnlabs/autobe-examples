import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates customer order creation flows including reference checks and
 * uniqueness constraint.
 *
 * This test executes a full E2E workflow for standard order creation by a newly
 * registered customer. Steps:
 *
 * 1. Register a new customer using a random email, password, name, and phone (via
 *    /auth/customer/join)
 * 2. Simulate or define minimal address and seller summary objects (since only
 *    summaries are required and no API for actual creation is documented)
 * 3. Generate a globally unique order_number and valid order ICreate body with all
 *    necessary foreign keys
 * 4. Create the order with /shoppingMall/customer/orders using valid customer,
 *    address, and seller references
 * 5. Assert that the response is type-safe, associates the correct customer, and
 *    all audit fields are present and valid
 * 6. Attempt to create a second order with the same order_number to verify
 *    uniqueness constraint is enforced (expect error)
 * 7. Assert on error and success paths, especially for business rule and
 *    referential integrity
 */
export async function test_api_customer_order_creation_basic_flow(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer
  const customer_email = typia.random<string & tags.Format<"email">>();
  const customer_password = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const customer_body = {
    email: customer_email,
    password: customer_password,
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customer_body,
    });
  typia.assert(customer);

  // Step 2: Synthesize minimal seller and address summary data
  const seller: IShoppingMallSeller.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const address: IShoppingMallAddress.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    full_name: RandomGenerator.name(),
    street: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
    province: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 10,
    }),
    postal_code: RandomGenerator.alphaNumeric(8),
    country: "South Korea",
    phone: RandomGenerator.mobile(),
    is_default: true,
  };

  // Step 3: Compose a unique order_number and valid order creation body
  const order_number = `ORD${new Date().getFullYear()}${RandomGenerator.alphaNumeric(8)}`;
  const order_body = {
    order_number,
    shopping_mall_customer_id: customer.id,
    shopping_mall_address_id: address.id,
    shopping_mall_seller_id: seller.id,
    status: "pending",
    total_amount: 19900,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;

  // Step 4: Create the order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: order_body,
    });
  typia.assert(order);

  // Step 5: Assert response structure, referential links, audit fields
  TestValidator.equals(
    "order_number returned matches input",
    order.order_number,
    order_body.order_number,
  );
  TestValidator.equals(
    "customer id association",
    order.customer.id,
    order_body.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "seller id association",
    order.seller.id,
    order_body.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "address id association",
    order.address.id,
    order_body.shopping_mall_address_id,
  );
  TestValidator.equals("status", order.status, order_body.status);
  TestValidator.equals("currency", order.currency, order_body.currency);
  TestValidator.equals(
    "total_amount",
    order.total_amount,
    order_body.total_amount,
  );
  TestValidator.predicate(
    "created_at is present",
    typeof order.created_at === "string" && !!order.created_at.length,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof order.updated_at === "string" && !!order.updated_at.length,
  );
  TestValidator.equals(
    "deleted_at must be null or undefined",
    order.deleted_at ?? null,
    null,
  );

  // Step 6: Attempt to create another order with same order_number to check uniqueness constraint
  await TestValidator.error("duplicate order_number should fail", async () => {
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: order_body,
    });
  });
}
