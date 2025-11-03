import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_create_shopping_cart_by_customer(
  connection: api.IConnection,
) {
  // 1. Register customer user
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Login customer user
  const customerLoginBody = {
    email: customer.email,
    password: "password123",
    ip: null,
    href: "https://example.com/",
    referrer: "https://google.com/",
  } satisfies IShoppingMallCustomer.ILogin;
  const loggedInCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(loggedInCustomer);

  // 3. Register admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 4. Login admin user
  const adminLoginBody = {
    email: admin.email,
    password: "password123",
    ip: null,
    href: "https://example.com/admin",
    referrer: "https://google.com/",
  } satisfies IShoppingMallAdmin.ILogin;
  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 5. Assign role "customer" to the registered customer
  const userRoleCreateBody = {
    user_id: customer.id,
    role_name: "customer",
  } satisfies IShoppingMallUserRole.ICreate;
  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleCreateBody,
    });
  typia.assert(userRole);
  TestValidator.equals(
    "user role assigned user_id should equal customer id",
    userRole.user_id,
    customer.id,
  );
  TestValidator.equals(
    "user role assigned role_name should be 'customer'",
    userRole.role_name,
    "customer",
  );

  // 6. Switch back to customer login (re-authenticate)
  const switchedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(switchedCustomer);

  // 7. Create shopping cart for the customer with a random session id
  const shoppingCartCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_customer_session_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies IShoppingMallShoppingCart.ICreate;

  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: shoppingCartCreateBody,
      },
    );
  typia.assert(shoppingCart);

  TestValidator.equals(
    "created shopping cart's customer id must match",
    shoppingCart.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "created shopping cart's session id must match",
    shoppingCart.shopping_mall_customer_session_id,
    shoppingCartCreateBody.shopping_mall_customer_session_id,
  );
  TestValidator.predicate(
    "created shopping cart should not be deleted",
    shoppingCart.deleted_at === null || shoppingCart.deleted_at === undefined,
  );
}
