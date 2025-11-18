import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

/**
 * Ensure that updating a legal hold with a non-existent business code is
 * rejected and does not create or modify any legal hold records.
 *
 * Business context:
 *
 * - Legal holds are managed by admin actors and identified by a stable business
 *   code (legalHoldCode) rather than an internal UUID.
 * - The update endpoint must only affect an existing hold; if the requested code
 *   does not exist, the platform should respond with a not-found style error
 *   and must not create or implicitly upsert a new hold.
 *
 * Test steps:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context for subsequent calls.
 * 2. Create a baseline legal hold via POST /shoppingMall/admin/legalHolds using a
 *    valid IShoppingMallLegalHold.ICreate payload, then assert the response
 *    with typia.assert.
 * 3. Construct a clearly non-existent legalHoldCode string that is guaranteed to
 *    differ from the created hold's code (e.g., prefix with "non-existent-" and
 *    add a random suffix), and optionally assert inequality with the existing
 *    code using TestValidator.notEquals.
 * 4. Prepare a minimal but valid IShoppingMallLegalHold.IUpdate body (for example,
 *    only updating title and description) to ensure the request shape is
 *    valid.
 * 5. Call api.functional.shoppingMall.admin.legalHolds.update with the
 *    non-existent legalHoldCode and update body, and wrap it in await
 *    TestValidator.error to assert that an error is thrown. Do not validate a
 *    specific HTTP status code; only verify that the operation fails.
 * 6. Optionally verify that the non-existent code is still not resolvable by
 *    calling .at with that code inside another TestValidator.error.
 * 7. Reload the originally created legal hold via .at using its real code and
 *    assert with typia.assert and TestValidator.equals that its immutable
 *    business identifier (code) has not changed. This demonstrates that the
 *    failed update did not impact existing records.
 */
export async function test_api_legal_hold_update_rejected_for_nonexistent_code(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated admin context
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!", // satisfies password format string
    // ip is optional; omit it to let backend derive or default
    href: "https://admin.example.com/join", // uri format
    referrer: "https://admin.example.com/landing", // uri format
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a baseline legal hold
  const createBody = {
    code: `LH-${RandomGenerator.alphaNumeric(12)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.alphaNumeric(10),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const created: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 3. Construct a guaranteed non-existent legalHoldCode
  const nonExistentCodeBase = `non-existent-${RandomGenerator.alphaNumeric(16)}`;
  const nonExistentCode =
    nonExistentCodeBase === createBody.code
      ? `${nonExistentCodeBase}-x`
      : nonExistentCodeBase;

  TestValidator.notEquals(
    "non-existent code must differ from created code",
    nonExistentCode,
    createBody.code,
  );

  // 4. Prepare a minimal but valid update body
  const updateBody = {
    title: "Updated Title for Non-existent Hold",
    description: "Attempting update on a non-existent legal hold.",
  } satisfies IShoppingMallLegalHold.IUpdate;

  // 5. Attempt update with non-existent code and expect failure
  await TestValidator.error(
    "updating legal hold with non-existent code must fail",
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.update(connection, {
        legalHoldCode: nonExistentCode,
        body: updateBody,
      });
    },
  );

  // 6. Confirm that retrieval with non-existent code also fails
  await TestValidator.error(
    "retrieving legal hold by non-existent code must fail",
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.at(connection, {
        legalHoldCode: nonExistentCode,
      });
    },
  );

  // 7. Reload the originally created legal hold to ensure it is unchanged
  const reloaded: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.at(connection, {
      legalHoldCode: createBody.code,
    });
  typia.assert(reloaded);

  TestValidator.equals(
    "created legal hold code remains unchanged after failed update",
    reloaded.code,
    createBody.code,
  );
}
