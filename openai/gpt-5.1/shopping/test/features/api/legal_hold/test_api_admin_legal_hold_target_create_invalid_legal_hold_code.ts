import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldTarget";

/**
 * Validate that creating a legal hold target with a non-existent legalHoldCode
 * fails.
 *
 * Business context:
 *
 * - Legal hold targets must always belong to an existing legal hold identified by
 *   a unique business-level `legalHoldCode` (mapped to
 *   shopping_mall_legal_holds.code).
 * - Admins should not be able to attach targets to arbitrary or invalid codes.
 *
 * Test steps:
 *
 * 1. Join as an admin using POST /auth/admin/join to establish an authenticated
 *    admin context (SDK automatically wires Authorization header).
 * 2. Generate a clearly invalid, random `legalHoldCode` that should not match any
 *    real legal hold (e.g., prefixed random string).
 * 3. Prepare a valid IShoppingMallLegalHoldTarget.ICreate payload with:
 *
 *    - Target_type: a plausible domain label (e.g. "customer").
 *    - Target_id: a random UUID.
 *    - Optional target_display and note strings.
 * 4. Call POST /shoppingMall/admin/legalHolds/{legalHoldCode}/targets with the
 *    invalid code and assert that the call fails with a client-side HTTP error
 *    using TestValidator.httpError, focusing on the business rule that the
 *    parent legal hold must exist (do not assert a single specific status code,
 *    but accept typical 4xx such as 400/404).
 */
export async function test_api_admin_legal_hold_target_create_invalid_legal_hold_code(
  connection: api.IConnection,
) {
  // 1. Join as admin to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Construct an invalid/non-existent legalHoldCode
  const invalidLegalHoldCode: string = `invalid-${RandomGenerator.alphaNumeric(16)}`;

  // 3. Prepare a valid legal hold target creation payload
  const targetCreateBody = {
    target_type: "customer",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    target_display: RandomGenerator.name(),
    note: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  // 4. Attempt to create a target for non-existent legal hold and assert error
  await TestValidator.httpError(
    "creating legal hold target with non-existent legalHoldCode must fail",
    [400, 404],
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.targets.create(
        connection,
        {
          legalHoldCode: invalidLegalHoldCode,
          body: targetCreateBody,
        },
      );
    },
  );
}
