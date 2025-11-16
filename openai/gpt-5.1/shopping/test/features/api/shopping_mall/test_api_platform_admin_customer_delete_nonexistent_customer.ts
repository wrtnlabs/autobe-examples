import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

/**
 * Validate deletion behavior for non-existent customers by platform admin.
 *
 * Business goal:
 *
 * - Ensure that when a platform administrator targets a customerId that does not
 *   exist in shopping_mall_customer, the hard-delete endpoint does not succeed
 *   silently and instead surfaces a clear error, while avoiding any unintended
 *   side effects.
 *
 * High-level flow:
 *
 * 1. Register a platform administrator using POST /auth/platformAdmin/join so that
 *    the connection holds a valid admin Authorization header.
 * 2. Optionally, register and verify a real customer to ensure the system is in a
 *    realistic state (but do not use that customer’s id as the target of the
 *    test; we want a definitely non-existent id).
 * 3. Generate a random UUID to act as a "non-existent" customerId, avoiding any
 *    IDs returned from step 2.
 * 4. As the platform admin, call DELETE
 *    /shoppingMall/platformAdmin/customers/{customerId} with the random UUID
 *    and assert that the API call fails (business error) using
 *    TestValidator.error, without validating the exact HTTP status code.
 * 5. Repeat step 4 with the same customerId to confirm idempotent error behavior:
 *    it must continue to fail without changing any observable state.
 *
 * Notes and constraints:
 *
 * - We must not send invalid types for customerId; always use a proper UUID
 *   string that satisfies the erase.Props type.
 * - We do not perform any direct DB inspection, so side-effect checks are limited
 *   to: the request throws, and no type-level contract violation occurs.
 * - We do not assert specific HTTP status codes; TestValidator.error is used only
 *   to confirm that an error occurs.
 */
export async function test_api_platform_admin_customer_delete_nonexistent_customer(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator via join endpoint to obtain admin tokens
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Optionally create a real customer to simulate a realistic environment
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 3. Generate a UUID that is extremely unlikely to match any real customer
  const nonexistentCustomerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Ensure we are authenticated as platform admin (join already set token, but
  // we can re-login to be explicit about context switching if desired).
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login-referrer",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 4. First attempt: deleting a non-existent customer must result in an error
  await TestValidator.error(
    "platform admin deleting nonexistent customer should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.erase(
        connection,
        {
          customerId: nonexistentCustomerId,
        },
      );
    },
  );

  // 5. Second attempt with the same ID: must also fail, demonstrating
  //    idempotent error behavior with no silent success.
  await TestValidator.error(
    "repeated deletion of same nonexistent customer should also fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.erase(
        connection,
        {
          customerId: nonexistentCustomerId,
        },
      );
    },
  );
}
