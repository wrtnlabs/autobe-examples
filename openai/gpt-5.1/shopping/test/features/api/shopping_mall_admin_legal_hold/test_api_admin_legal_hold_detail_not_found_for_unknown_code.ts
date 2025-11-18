import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

/**
 * Validate not-found behavior of admin legal hold detail lookup.
 *
 * Business purpose: This test ensures that the legal hold detail endpoint
 * correctly returns a not-found error when an administrator queries a legal
 * hold code that does not exist. It is important to verify that the system
 * differentiates between authorization failures and missing data: an
 * authenticated admin must receive a proper not-found error (typically 404)
 * when requesting a non-existent legalHoldCode, instead of succeeding with
 * bogus data or misclassifying the error.
 *
 * High-level steps:
 *
 * 1. Register a new shopping mall administrator via POST /auth/admin/join to
 *    establish an authenticated admin context.
 * 2. Construct a synthetic legalHoldCode value that is extremely unlikely to exist
 *    in the database (for example, a namespaced prefix plus a random suffix).
 * 3. Invoke GET /shoppingMall/admin/legalHolds/{legalHoldCode} with this unknown
 *    code using the authenticated admin connection.
 * 4. Assert that the call results in an HTTP error instead of returning a
 *    successful IShoppingMallLegalHold payload. The exact status code is
 *    expected to be a not-found style response (404), but the test focuses on
 *    the fact that it fails, not on inspecting the concrete status value.
 *
 * The test deliberately does not create any legal hold records, because the
 * purpose is to validate behavior for non-existent codes in an otherwise valid
 * admin session.
 */
export async function test_api_admin_legal_hold_detail_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Register a new shopping mall administrator to obtain an authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Construct a synthetic legalHoldCode that should not exist
  const unknownLegalHoldCode = `non-existent-legal-hold-${RandomGenerator.alphaNumeric(16)}`;

  // 3 & 4. Call the detail endpoint with the unknown code and assert it fails
  await TestValidator.error(
    "unknown legal hold code should result in error",
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.at(connection, {
        legalHoldCode: unknownLegalHoldCode,
      });
    },
  );
}
