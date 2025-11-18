import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

export async function test_api_admin_catalog_block_reason_update_duplicate_code_conflict(
  connection: api.IConnection,
) {
  /**
   * Validate that updating a catalog block reason to a duplicate `code` value
   * is rejected.
   *
   * Business context:
   *
   * - Admins manage catalog block reasons (e.g., policy_violation, safety_issue)
   *   which are referenced by catalog moderation and governance flows.
   * - The `code` field of IShoppingMallCatalogBlockReason is globally unique and
   *   must remain unique for both creation and update operations.
   *
   * Test steps:
   *
   * 1. Register an administrator via POST /auth/admin/join to obtain an authorized
   *    admin context.
   * 2. Create a first catalog block reason with `code = "policy_violation"`.
   * 3. Create a second catalog block reason with `code = "safety_issue"`.
   * 4. Attempt to update the second reason so that its `code` becomes
   *    "policy_violation" (duplicating the first reason’s `code`).
   * 5. Assert that the update call fails (throws an error), which implies that the
   *    backend enforces uniqueness of `code` on update.
   */

  // 1. Register an administrator and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://landing.shoppingmall.test/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create the first catalog block reason with code = "policy_violation"
  const firstReasonCreateBody = {
    code: "policy_violation",
    name: "Policy Violation",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    severity_level: "high",
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const firstReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: firstReasonCreateBody,
      },
    );
  typia.assert<IShoppingMallCatalogBlockReason>(firstReason);

  // 3. Create the second catalog block reason with a different code
  const secondReasonCreateBody = {
    code: "safety_issue",
    name: "Safety Issue",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    severity_level: "medium",
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const secondReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: secondReasonCreateBody,
      },
    );
  typia.assert<IShoppingMallCatalogBlockReason>(secondReason);

  // Sanity check: created codes are as expected
  TestValidator.equals(
    "first reason code should be policy_violation",
    firstReason.code,
    "policy_violation",
  );
  TestValidator.equals(
    "second reason code should be safety_issue",
    secondReason.code,
    "safety_issue",
  );

  // 4 & 5. Attempt to update the second reason's code to the first reason's code
  // and assert that the operation fails due to uniqueness enforcement.
  await TestValidator.error(
    "updating catalog block reason code to a duplicate value must fail",
    async () => {
      await api.functional.shoppingMall.admin.catalogBlockReasons.update(
        connection,
        {
          catalogBlockReasonId: secondReason.id,
          body: {
            code: firstReason.code,
          } satisfies IShoppingMallCatalogBlockReason.IUpdate,
        },
      );
    },
  );
}
