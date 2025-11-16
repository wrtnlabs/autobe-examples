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
 * Verify that only platform administrators can delete customer carts via the
 * platform-admin DELETE endpoint.
 *
 * ## Business goal
 *
 * Ensure that the role-based access control boundary between a regular customer
 * and a platform administrator is correctly enforced for administrative cart
 * deletion operations. A customer must not be able to call the platform-admin
 * erase API successfully, while a platform admin must be allowed to delete the
 * same cart.
 *
 * ## High-level flow
 *
 * 1. Register (join) as a customer to obtain a customer JWT and authenticated
 *    session context.
 * 2. While authenticated as that customer, create a persistent cart via the
 *    customer carts creation endpoint.
 * 3. Still under the customer token, attempt to call the platform-admin customer
 *    cart erase endpoint for that cart and expect the call to fail
 *    (authorization error).
 * 4. Register (join) as a platform administrator to obtain an admin JWT and switch
 *    the connection context to platform admin.
 * 5. As the platform admin, call the same erase endpoint for the same customer
 *    cart and expect it to succeed.
 *
 * ## Constraints and notes
 *
 * - Use only the SDK functions listed in the materials:
 *
 *   - Api.functional.auth.customer.join
 *   - Api.functional.auth.customer.login (not strictly needed here)
 *   - Api.functional.auth.platformAdmin.join
 *   - Api.functional.auth.platformAdmin.login (not strictly needed here)
 *   - Api.functional.shoppingMall.customer.customerCarts.create
 *   - Api.functional.shoppingMall.platformAdmin.customerCarts.erase
 * - Do not touch connection.headers directly; rely on SDK-managed Authorization
 *   header switching performed by join/login calls.
 * - Do not check HTTP status codes; simply assert that the customer attempt
 *   results in an error and the admin attempt succeeds.
 * - All request bodies must strictly satisfy their DTO types; no use of `as any`
 *   or type-unsafe patterns is allowed.
 *
 * ## Step-by-step process
 *
 * 1. Call customer join with a random IShoppingMallCustomerAuth.IJoin payload to
 *    obtain IShoppingMallCustomer.IAuthorized and a customer token.
 * 2. While authenticated as the customer, call customer cart create with a minimal
 *    valid IShoppingMallCustomerCart.ICreate body and capture the returned
 *    cart.id.
 * 3. Use TestValidator.error to assert that calling
 *    api.functional.shoppingMall.platformAdmin.customerCarts.erase with the
 *    cart id under the customer token fails.
 * 4. Call platformAdmin join with a random IShoppingMallPlatformAdminJoin.IRequest
 *    payload to obtain IShoppingMallPlatformAdmin.IAuthorized and an admin
 *    token.
 * 5. Call api.functional.shoppingMall.platformAdmin.customerCarts.erase again with
 *    the same cart id under the admin token and assert that it completes
 *    successfully (no error thrown).
 */
export async function test_api_platform_admin_delete_requires_admin_role(
  connection: api.IConnection,
) {
  // 1. Register as a customer and obtain an authorized customer session
  const customerJoinBody = typia.random<IShoppingMallCustomerAuth.IJoin>();
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 2. While authenticated as the customer, create a persistent customer cart
  const cartCreateBody = {} satisfies IShoppingMallCustomerCart.ICreate;
  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(customerCart);

  // 3. Attempt to delete the cart via the platform-admin erase endpoint as the customer
  await TestValidator.error(
    "customer cannot delete cart via platform admin endpoint",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customerCarts.erase(
        connection,
        {
          customerCartId: customerCart.id,
        },
      );
    },
  );

  // 4. Register a platform administrator and obtain an authorized admin session
  const adminJoinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 5. As the platform admin, successfully delete the same customer cart
  await api.functional.shoppingMall.platformAdmin.customerCarts.erase(
    connection,
    {
      customerCartId: customerCart.id,
    },
  );
}
