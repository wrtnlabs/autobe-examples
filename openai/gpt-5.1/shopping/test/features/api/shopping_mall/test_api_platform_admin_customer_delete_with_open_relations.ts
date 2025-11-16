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
 * Validate platform admin customer deletion behavior and basic authorization
 * constraints.
 *
 * Business context: This test exercises the hard-delete endpoint DELETE
 * /shoppingMall/platformAdmin/customers/{customerId} exposed for platform admin
 * actors. Although the original scenario describes complex constraints around
 * open orders, carts, and disputes, the available SDK only exposes
 * authentication and the erase operation. Therefore, this test focuses on what
 * is observable purely through those APIs:
 *
 * 1. A platform admin can delete an existing customer by ID when properly
 *    authenticated.
 * 2. Non-admin actors (customers) cannot invoke the platform admin erase endpoint
 *    successfully.
 * 3. Attempting to delete an obviously non-existent customer ID does not succeed
 *    silently and should result in an error.
 *
 * High-level flow:
 *
 * 1. Join as a platform admin (auto-authenticates connection as admin).
 * 2. Join as a customer (connection becomes the customer) and capture the
 *    customerId from the authorization envelope.
 * 3. Log in again as the platform admin to restore admin credentials on the shared
 *    connection.
 * 4. Call erase(customerId) and ensure the call completes without throwing.
 * 5. Log in as the customer and attempt erase() with a random UUID to validate
 *    that non-admin actors cannot perform platform admin deletes.
 * 6. Log back in as the platform admin and attempt erase() for another random
 *    UUID, asserting that deleting a non-existent customer fails.
 */
export async function test_api_platform_admin_customer_delete_with_open_relations(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin; this will authenticate the connection
  //    as that admin and provide us with baseline admin credentials.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphabets(12);

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: adminPassword,
        ip: null,
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies IShoppingMallPlatformAdminJoin.IRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Register a new customer; the connection becomes authenticated as
  //    this customer. We capture the customerId for the erase test.
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = RandomGenerator.alphabets(12);

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
        ip: null,
        href: "https://shop.example.com/join",
        referrer: "https://shop.example.com/landing",
      } satisfies IShoppingMallCustomerAuth.IJoin,
    });
  typia.assert(customerAuthorized);
  const customerId = customerAuthorized.id;

  // 3. Log back in as the platform admin so that subsequent calls are
  //    executed under the platformAdmin actor.
  const reloggedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/dashboard",
      } satisfies IShoppingMallPlatformAdminLogin.IRequest,
    });
  typia.assert(reloggedAdmin);

  // 4. Happy path: erase the freshly created customer as platform admin.
  await api.functional.shoppingMall.platformAdmin.customers.erase(connection, {
    customerId,
  });

  // 5. Switch context back to the customer actor and verify that a
  //    non-admin caller cannot successfully invoke the platform admin
  //    erase endpoint.
  const reloggedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        ip: null,
        href: "https://shop.example.com/login",
        referrer: "https://shop.example.com/account",
      } satisfies IShoppingMallCustomerAuth.ILogin,
    });
  typia.assert(reloggedCustomer);

  const randomCustomerIdAsCustomer: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "non-admin actor cannot call platform admin customer erase",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.erase(
        connection,
        {
          customerId: randomCustomerIdAsCustomer,
        },
      );
    },
  );

  // 6. Switch context again to platform admin and verify that deleting an
  //    obviously non-existent customerId yields an error rather than a
  //    silent success, approximating existence and business precondition
  //    checks around the erase operation.
  const adminAfterCustomer: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/customers",
      } satisfies IShoppingMallPlatformAdminLogin.IRequest,
    });
  typia.assert(adminAfterCustomer);

  const nonExistentCustomerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "deleting non-existent customer should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.erase(
        connection,
        {
          customerId: nonExistentCustomerId,
        },
      );
    },
  );
}
