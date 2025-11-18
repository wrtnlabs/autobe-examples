import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

/**
 * Ensure duplicate legal hold code creation is rejected.
 *
 * This E2E test validates the uniqueness constraint on the `code` field for
 * legal holds created via POST /shoppingMall/admin/legalHolds.
 *
 * Business workflow:
 *
 * 1. Register and authenticate an admin using POST /auth/admin/join.
 *
 *    - This issues tokens and configures the connection headers via the SDK.
 * 2. Create the first legal hold with a specific business `code` using
 *    IShoppingMallLegalHold.ICreate and assert success.
 * 3. Attempt to create a second legal hold reusing the same `code` but with
 *    different non-key fields and assert that the request fails with a
 *    client-side HTTP error (4xx), indicating a uniqueness violation on
 *    `code`.
 *
 * The available SDK does not provide a GET-by-code endpoint, so we validate
 * uniqueness solely by the failure of the second creation call and by asserting
 * the first response contains the requested `code`.
 */
export async function test_api_admin_legal_hold_creation_with_duplicate_code_rejection(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. First legal hold creation (expected success)
  const duplicateCode = "CASE-" + RandomGenerator.alphaNumeric(8);

  const firstLegalHoldBody = {
    code: duplicateCode,
    title: "Initial Legal Hold for Duplicate Code Test",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    scope_description: RandomGenerator.paragraph({ sentences: 3 }),
    external_reference: "REF-" + RandomGenerator.alphaNumeric(6),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const firstLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: firstLegalHoldBody,
    });
  typia.assert<IShoppingMallLegalHold>(firstLegalHold);

  // Verify that the created legal hold has the expected code
  TestValidator.equals(
    "first legal hold created with requested code",
    firstLegalHold.code,
    duplicateCode,
  );

  // 3. Second legal hold creation with duplicate code (expected failure)
  const secondLegalHoldBody = {
    code: duplicateCode, // same code as first
    title: "Second Legal Hold With Duplicate Code",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    scope_description: RandomGenerator.paragraph({ sentences: 2 }),
    external_reference: "REF-" + RandomGenerator.alphaNumeric(6),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  await TestValidator.httpError(
    "duplicate legal hold code must be rejected",
    [400, 409, 422],
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.create(connection, {
        body: secondLegalHoldBody,
      });
    },
  );
}
