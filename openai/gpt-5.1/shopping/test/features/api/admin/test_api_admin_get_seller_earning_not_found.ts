import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";

/**
 * Ensure admin GET seller earning returns an error for non-existent ID.
 *
 * Business purpose
 *
 * - Admin-facing tooling must behave safely when an operator drills into a seller
 *   earning that does not exist (for example, stale links or already-deleted
 *   records).
 * - Instead of leaking partial information or succeeding with empty payloads, the
 *   backend must signal a not-found condition via an error.
 *
 * Scenario
 *
 * 1. Register an admin using POST /auth/admin/join so that subsequent calls are
 *    authenticated as an administrator.
 * 2. Construct a sellerEarningId that does not correspond to any real record. In
 *    real environments this would be a random UUID not used anywhere. In this
 *    e2e test we rely on the fact that if
 *    api.functional.shoppingMall.admin.sellerEarnings.at throws an HttpError,
 *    we treat it as a not-found style failure regardless of exact status code
 *    (we do not assert numeric codes by policy).
 * 3. Call the GET endpoint with that non-existent id and expect the SDK to surface
 *    an HttpError.
 * 4. Assert that the call indeed fails (using TestValidator.error) and that no
 *    IShoppingMallSellerEarning value is observable from the failing branch.
 *
 * Notes
 *
 * - We do not attempt to inspect HTTP status codes or response bodies because
 *   status-code-level checks are forbidden by the test policies; only the
 *   presence of an error is validated.
 * - We must not touch connection.headers directly; authentication is handled
 *   automatically by the SDK after /auth/admin/join.
 */
export async function test_api_admin_get_seller_earning_not_found(
  connection: api.IConnection,
) {
  // 1. Admin registration (authentication context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Prepare a random UUID as a candidate non-existent seller earning id.
  const missingSellerEarningId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Verify that fetching with that id results in an error.
  await TestValidator.error(
    "admin get seller earning with non-existent id should fail",
    async () => {
      await api.functional.shoppingMall.admin.sellerEarnings.at(connection, {
        sellerEarningId: missingSellerEarningId,
      });
    },
  );
}
