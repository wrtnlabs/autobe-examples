import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Validate behavior of GET
 * /shoppingMall/admin/refundRequestReasons/{reasonCode} when the requested code
 * does not exist.
 *
 * Business goal
 *
 * - Ensure that the admin-facing refund request reason lookup endpoint fails
 *   cleanly for unknown reason codes, instead of returning a fake or random
 *   configuration.
 * - Confirm that not-found handling is stable and has no data-creation
 *   side-effects.
 *
 * Covered steps
 *
 * 1. Register an admin account using POST /auth/admin/join so that all subsequent
 *    calls are executed in an authenticated admin context.
 * 2. Optionally create a legitimate refund request reason via POST
 *    /shoppingMall/admin/refundRequestReasons to guarantee that the master-data
 *    table is operational and to have a known, existing code that we will
 *    avoid.
 * 3. Generate a random business code string to use as a definitely-nonexistent
 *    reasonCode. To further minimize collision risk, ensure it differs from any
 *    code we created explicitly in this test.
 * 4. Invoke api.functional.shoppingMall.admin.refundRequestReasons.at with the
 *    nonexistent reasonCode and assert that the call fails by throwing, using
 *    TestValidator.error. We do not verify HTTP status codes or error payload
 *    shapes, only that it is treated as an error path rather than a success
 *    returning IShoppingMallRefundRequestReason.
 * 5. Repeat the GET call with the same nonexistent reasonCode to validate that
 *    behavior is consistent and no configuration row has been created as a side
 *    effect of the first failing call.
 */
export async function test_api_admin_refund_request_reason_get_not_found_behavior(
  connection: api.IConnection,
) {
  // 1. Register an admin via /auth/admin/join to obtain an authorized context.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Optionally create a known, valid refund request reason so that we know
  //    at least one real row exists in the table and we can avoid its code.
  const existingReasonBody =
    typia.random<IShoppingMallRefundRequestReason.ICreate>();
  const existingReason: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: existingReasonBody,
      },
    );
  typia.assert(existingReason);

  // 3. Generate a definitely-nonexistent reasonCode. We create a random code
  //    and, if it accidentally matches the created reason, regenerate once.
  let nonexistentCode: string = RandomGenerator.alphaNumeric(24);
  if (nonexistentCode === existingReason.code) {
    nonexistentCode = RandomGenerator.alphaNumeric(24);
  }
  TestValidator.notEquals(
    "nonexistentCode must differ from existing reason code",
    nonexistentCode,
    existingReason.code,
  );

  // 4. Call GET with the nonexistent reasonCode and assert it fails.
  await TestValidator.error(
    "GET refundRequestReason.at must fail for nonexistent reasonCode (first call)",
    async () => {
      await api.functional.shoppingMall.admin.refundRequestReasons.at(
        connection,
        {
          reasonCode: nonexistentCode,
        },
      );
    },
  );

  // 5. Repeat the request with the same code to ensure consistent behavior and
  //    that no master-data record was created as a side-effect.
  await TestValidator.error(
    "GET refundRequestReason.at must consistently fail for the same nonexistent reasonCode",
    async () => {
      await api.functional.shoppingMall.admin.refundRequestReasons.at(
        connection,
        {
          reasonCode: nonexistentCode,
        },
      );
    },
  );
}
