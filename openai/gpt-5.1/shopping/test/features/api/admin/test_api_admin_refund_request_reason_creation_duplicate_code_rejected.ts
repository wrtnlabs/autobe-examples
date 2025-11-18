import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Ensure that creating a refund request reason with a duplicate `code` is
 * rejected.
 *
 * Business context: Administrative users manage master-data records for
 * standardized refund request reasons in
 * `shopping_mall_refund_request_reasons`. The `code` field is a globally unique
 * business key (e.g., `damaged_item`) that must not be reused across multiple
 * reason records. Attempting to create a second reason with the same `code`
 * should fail, preserving referential integrity and analytical consistency.
 *
 * Test workflow:
 *
 * 1. Register a new administrator via POST /auth/admin/join to obtain an
 *    authenticated admin context (SDK auto-wires the access token into
 *    `connection`).
 * 2. As this admin, successfully create a refund request reason via POST
 *    /shoppingMall/admin/refundRequestReasons with a unique `code` and valid
 *    configuration flags.
 * 3. Attempt to create another refund request reason with the _same_ `code` but
 *    different descriptive fields.
 * 4. Verify that the second creation attempt fails (throws) due to the uniqueness
 *    constraint on `code`.
 *
 * Limitations and adjustments:
 *
 * - We cannot assert specific HTTP status codes or error-body shapes by design;
 *   we only check that an error is thrown using TestValidator.error.
 * - No GET endpoint for refund reasons is available in the provided SDK, so we
 *   infer that only one record exists from the combination of a successful
 *   first create and a failing second create with the same `code`.
 */
export async function test_api_admin_refund_request_reason_creation_duplicate_code_rejected(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new refund request reason with a unique code
  const reasonCode = `code_${RandomGenerator.alphabets(12)}`;

  const firstCreateBody = {
    code: reasonCode,
    name: "Damaged item (initial)",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    applies_to_cancellation: true,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  const firstReason: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: firstCreateBody,
      },
    );
  typia.assert(firstReason);

  TestValidator.equals(
    "created refund reason code matches request",
    firstReason.code,
    reasonCode,
  );

  // 3. Attempt to create another reason with the same code but different fields
  const secondCreateBody = {
    code: reasonCode, // duplicate on purpose
    name: "Damaged item (duplicate)",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    applies_to_cancellation: false,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  // 4. Assert that the second creation attempt fails due to uniqueness
  await TestValidator.error(
    "duplicate refund reason code is rejected",
    async () => {
      await api.functional.shoppingMall.admin.refundRequestReasons.create(
        connection,
        {
          body: secondCreateBody,
        },
      );
    },
  );
}
