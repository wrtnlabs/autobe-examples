import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_payment_transaction_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate not-found behavior for payment transaction lookup by platform
   * admin.
   *
   * Business goal: Ensure that when a platform administrator queries a payment
   * transaction by ID and the target transaction does not exist, the platform
   * responds with a standardized error (surfaced as HttpError by the SDK)
   * without returning any IShoppingMallPaymentTransaction payload or leaking
   * internal details.
   *
   * Steps:
   *
   * 1. Bootstrap a fresh platform admin via POST /auth/platformAdmin/join using
   *    random but valid join payload; this also configures the connection with
   *    an Authorization header through the SDK.
   * 2. Generate a random UUID to be used as a non-existent paymentTransactionId
   *    (collision is practically impossible in isolated test runs).
   * 3. As the authenticated platform admin, call GET
   *    /shoppingMall/platformAdmin/paymentTransactions/{paymentTransactionId}
   *    with the random UUID and assert that it fails with an HttpError.
   * 4. Verify only that an error is raised and that no
   *    IShoppingMallPaymentTransaction instance is produced; do not assert the
   *    exact HTTP status code or error body structure to keep the test stable
   *    across global error handling changes.
   */

  // 1. Join as a new platform admin to obtain an authorized context.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Generate a random UUID to act as a non-existent paymentTransactionId.
  const nonexistentPaymentTransactionId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Call the payment transaction detail endpoint and assert that it fails.
  await TestValidator.error(
    "platform admin payment transaction lookup with non-existent id should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.at(
        connection,
        {
          paymentTransactionId: nonexistentPaymentTransactionId,
        },
      );
    },
  );
}
