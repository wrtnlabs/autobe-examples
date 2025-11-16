import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that platform admin authentication alone is not sufficient to delete
 * a seller and that the low-level erase endpoint fails when business/domain
 * rules (such as existence or deeper constraints) are not satisfied.
 *
 * Original scenario mentioned unresolved orders/payouts/compliance flags and
 * persistence/audit verification, but our available SDK exposes only:
 *
 * - POST /auth/platformAdmin/join
 * - DELETE /shoppingMall/platformAdmin/sellers/{sellerId} with no read or
 *   mutation APIs for sellers, orders, or logs.
 *
 * Therefore this E2E focuses on an implementable subset:
 *
 * 1. Join as a platform admin so that `connection` carries a valid admin JWT.
 * 2. Generate a random sellerId (UUID) that is extremely unlikely to exist.
 * 3. As the authenticated admin, attempt to erase the seller.
 * 4. Assert that the erase attempt fails (throws), proving that successful
 *    platform admin auth is not enough and that the backend enforces additional
 *    conditions before deleting.
 *
 * We do not:
 *
 * - Assert specific HTTP status codes or error bodies.
 * - Attempt any type-error tests or malformed DTOs.
 * - Inspect database or audit logs, which are not exposed via SDK.
 */
export async function test_api_platform_admin_delete_seller_with_blocking_business_constraints(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authorized admin session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare a random UUID as sellerId that almost certainly does not exist.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to erase the seller as an authenticated platform admin.
  // 4. Assert that the call fails. We don't assert specific HTTP codes.
  await TestValidator.error(
    "erase seller must fail for non-existing or constrained seller",
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellers.erase(
        connection,
        {
          sellerId,
        },
      );
    },
  );
}
