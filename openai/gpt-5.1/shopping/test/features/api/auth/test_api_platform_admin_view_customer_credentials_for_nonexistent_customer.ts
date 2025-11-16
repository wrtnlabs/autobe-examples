import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomerCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCredential";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform administrator receives an error when requesting
 * credential metadata for a non-existent customer.
 *
 * Business intent:
 *
 * - Ensure that GET
 *   /shoppingMall/platformAdmin/customers/{customerId}/credentials does not
 *   return an IShoppingMallCustomerCredential payload when the customerId does
 *   not correspond to any shopping_mall_customer row.
 * - Confirm that the endpoint fails consistently (idempotently) for the same
 *   non-existent customerId and does not leak credential existence details.
 *
 * Scenario steps:
 *
 * 1. Register (join) a platform administrator via POST /auth/platformAdmin/join so
 *    that subsequent calls execute under platformAdmin authorization.
 * 2. Generate a random UUID value that will be used as a synthetic, non-existent
 *    customerId.
 * 3. Call GET /shoppingMall/platformAdmin/customers/{customerId}/credentials with
 *    this customerId and assert that the call throws an error instead of
 *    returning an IShoppingMallCustomerCredential object.
 * 4. Repeat the same call with the same customerId and assert that it fails again,
 *    demonstrating stable not-found style behavior for unknown customers.
 */
export async function test_api_platform_admin_view_customer_credentials_for_nonexistent_customer(
  connection: api.IConnection,
) {
  // 1. Join as a platform administrator to obtain an authorized session.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: "Platform Admin",
    password: "Str0ngP@ssw0rd!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Construct a synthetic customerId that is extremely unlikely to exist.
  const nonexistentCustomerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. First attempt: expect the credential view call to fail.
  await TestValidator.error(
    "platform admin cannot view credentials for a non-existent customer (first attempt)",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.credentials.at(
        connection,
        {
          customerId: nonexistentCustomerId,
        },
      );
    },
  );

  // 4. Second attempt with the same ID: behavior should remain the same
  // (idempotent not-found style behavior).
  await TestValidator.error(
    "platform admin cannot view credentials for a non-existent customer (second attempt)",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.credentials.at(
        connection,
        {
          customerId: nonexistentCustomerId,
        },
      );
    },
  );
}
