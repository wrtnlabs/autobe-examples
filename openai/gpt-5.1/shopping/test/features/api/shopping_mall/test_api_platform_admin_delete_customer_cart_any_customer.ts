import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

/**
 * Validate that a platform administrator can delete any customer's persistent
 * cart.
 *
 * Business context
 *
 * - Customers create server-side carts while authenticated.
 * - Platform admins need cross-customer operational control, including the
 *   ability to delete arbitrary customer carts.
 *
 * Scenario steps
 *
 * 1. Register and authenticate a customer via /auth/customer/join.
 * 2. (Optionally) Re-login the same customer via /auth/customer/login to exercise
 *    the explicit login path.
 * 3. While authenticated as the customer, create a persistent cart via POST
 *    /shoppingMall/customer/customerCarts and capture its id.
 * 4. Register and authenticate a platform admin via /auth/platformAdmin/join (this
 *    also sets the admin Authorization header on the shared connection).
 * 5. (Optionally) Re-login as the same platform admin via
 *    /auth/platformAdmin/login to validate that admin login also works.
 * 6. As the platform admin, call DELETE
 *    /shoppingMall/platformAdmin/customerCarts/{customerCartId} to delete the
 *    customer's cart created in step 3.
 * 7. Assert that the delete call succeeds (no error thrown).
 * 8. Attempt to fetch the same cart via GET
 *    /shoppingMall/platformAdmin/customerCarts/{customerCartId} and assert that
 *    this results in an error, demonstrating the cart no longer exists and that
 *    admins indeed have cross-customer deletion authority.
 */
export async function test_api_platform_admin_delete_customer_cart_any_customer(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer.
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: "customer-password-123",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorizedFromJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorizedFromJoin);

  // 2. Explicit customer login using the same email/password combination.
  const customerLoginBody = {
    email: customerEmail,
    password: "customer-password-123",
    ip: null,
    href: "https://customer.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/login-ref" as string &
      tags.Format<"uri">,
    userAgent: "E2E-Customer-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAuthorizedFromLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuthorizedFromLogin);

  TestValidator.equals(
    "customer id from join and login must match",
    customerAuthorizedFromLogin.id,
    customerAuthorizedFromJoin.id,
  );

  // 3. Create a persistent customer cart for this customer.
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US-East",
    channel: "web",
    metadata: {
      campaign: "spring-sale",
      segment: "e2e-test",
    },
    is_active: true,
    source_guest_token: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(customerCart);

  TestValidator.equals(
    "created cart belongs to expected customer",
    customerCart.customer.id,
    customerAuthorizedFromLogin.id,
  );

  const customerCartId: string & tags.Format<"uuid"> = customerCart.id;

  // 4. Register and authenticate a platform administrator.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "platform-admin-password-123",
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorizedFromJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 5. Explicit platform admin login to confirm admin authentication behavior.
  const adminLoginBody = {
    email: adminEmail,
    password: "platform-admin-password-123",
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/login-ref" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAuthorizedFromLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  TestValidator.equals(
    "platform admin id from join and login must match",
    adminAuthorizedFromLogin.id,
    adminAuthorizedFromJoin.id,
  );

  // 6. As the platform admin, delete the customer's cart.
  await api.functional.shoppingMall.platformAdmin.customerCarts.erase(
    connection,
    {
      customerCartId,
    },
  );

  // 7. Verify that subsequent attempts to fetch the cart fail.
  await TestValidator.error(
    "platform admin cannot fetch deleted customer cart",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customerCarts.at(
        connection,
        {
          customerCartId,
        },
      );
    },
  );
}
