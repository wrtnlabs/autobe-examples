import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validates admin privilege for shopping cart detail retrieval.
 *
 * This test simulates a real-world scenario where:
 *
 * 1. A new customer is created and registers (join), then logs in.
 * 2. The customer creates a new shopping cart via the customer API.
 * 3. A new admin is created (join), then logs in to establish privilege context.
 * 4. As admin, invokes the admin-only endpoint to retrieve the cart info by cart
 *    ID.
 * 5. Verifies the cart info is complete and correctly references the customer.
 * 6. Ensures all expected fields including owner, timestamps, and cart id are
 *    present and match the initial data.
 */
export async function test_api_admin_cart_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();

  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: customerName,
        phone: customerPhone,
      } satisfies IShoppingMallCustomer.ICreate,
    },
  );
  typia.assert(customerAuthorized);

  // 2. Customer logs in
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://test-client.app/path",
      referrer: "https://test-client.app/prev",
      ip: undefined,
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 3. Customer creates a new cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {} satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 4. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminName = RandomGenerator.name();

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminAuthorized);

  // 5. Admin logs in
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 6. Admin retrieves the cart detail
  const adminCart = await api.functional.shoppingMall.admin.carts.at(
    connection,
    {
      cartId: typia.assert<string & tags.Format<"uuid">>(cart.id!),
    },
  );
  typia.assert(adminCart);

  // 7. Validate cart detail matches initial cart
  TestValidator.equals("cart id matches", adminCart.id, cart.id);
  TestValidator.equals(
    "customer id matches",
    adminCart.customer.id,
    customerAuthorized.id,
  );
  TestValidator.equals(
    "customer name matches",
    adminCart.customer.name,
    customerAuthorized.name,
  );
  TestValidator.equals(
    "cart created_at exists",
    typeof adminCart.created_at,
    "string",
  );
  TestValidator.equals(
    "cart updated_at exists",
    typeof adminCart.updated_at,
    "string",
  );
}
