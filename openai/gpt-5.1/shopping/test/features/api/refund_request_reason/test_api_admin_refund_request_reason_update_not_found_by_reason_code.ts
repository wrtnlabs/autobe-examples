import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Ensure updating a non-existent refund request reason by reasonCode results in
 * a not-found HTTP error without side effects.
 *
 * Business goal:
 *
 * - Prove that the admin-facing update endpoint for refund request reasons does
 *   not upsert or implicitly create records when a non-existent business code
 *   is provided.
 * - Confirm that the error is a proper not-found style HTTP error (404) while the
 *   caller is fully authenticated as an admin, so the failure cannot be
 *   mistaken for an authorization issue.
 *
 * Scenario steps:
 *
 * 1. Join as an admin using POST /auth/admin/join, which also sets the
 *    Authorization header on the connection via the SDK side effect.
 * 2. Generate a clearly non-existent reasonCode string in a dedicated test
 *    namespace, e.g., "e2e-not-found-<random>" to avoid clashing with any
 *    legitimate codes.
 * 3. Prepare a valid IShoppingMallRefundRequestReason.IUpdate payload that changes
 *    typical mutable fields like name, description, applicability flags, and
 *    is_active, but does not attempt to modify the code itself (since the code
 *    is an immutable path parameter).
 * 4. Call api.functional.shoppingMall.admin.refundRequestReasons.update with the
 *    fake reasonCode and the valid body, asserting via TestValidator.httpError
 *    that the result is an HTTP 404.
 * 5. Optionally repeat the update once more against the same reasonCode to ensure
 *    there was no side-effect creation (still 404), reinforcing the separation
 *    of create and update responsibilities.
 */
export async function test_api_admin_refund_request_reason_update_not_found_by_reason_code(
  connection: api.IConnection,
) {
  // 1. Join as an admin to get an authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.e2e-test.local/join",
    referrer: "https://admin.e2e-test.local/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Generate a reasonCode that should not exist.
  const randomSuffix: string = RandomGenerator.alphaNumeric(16);
  const nonExistentReasonCode: string = `e2e-not-found-${randomSuffix}`;

  // 3. Prepare a valid IShoppingMallRefundRequestReason.IUpdate payload.
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    applies_to_cancellation: true,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.IUpdate;

  // 4. First update attempt should result in HTTP 404 not-found.
  await TestValidator.httpError(
    "update non-existent refund request reason should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.refundRequestReasons.update(
        connection,
        {
          reasonCode: nonExistentReasonCode,
          body: updateBody,
        },
      );
    },
  );

  // 5. Second update attempt with the same code should still be 404,
  //    proving no upsert/creation side effect.
  await TestValidator.httpError(
    "repeated update on same non-existent reasonCode should still return 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.refundRequestReasons.update(
        connection,
        {
          reasonCode: nonExistentReasonCode,
          body: updateBody,
        },
      );
    },
  );
}
