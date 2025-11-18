import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldTarget";

/**
 * Verify that deleting a legal hold target requires valid admin authentication.
 *
 * Business context: Legal holds and their targets are strictly governed by
 * admin-only governance/ compliance APIs. Deleting a legal hold target should
 * never be possible from an unauthenticated or non-admin context. This test
 * ensures that the DELETE endpoint for a legal hold target is protected by
 * admin authorization and that only a properly authenticated admin connection
 * can perform the deletion.
 *
 * Scenario:
 *
 * 1. Register an admin via POST /auth/admin/join, obtaining an
 *    IShoppingMallAdmin.IAuthorized payload whose token is automatically
 *    installed on the connection.
 * 2. Using the admin-authenticated connection, create a legal hold via POST
 *    /shoppingMall/admin/legalHolds, capturing its `code` field.
 * 3. Using the same admin connection, create a legal hold target for that hold via
 *    POST /shoppingMall/admin/legalHolds/{legalHoldCode}/targets, capturing the
 *    returned target `id`.
 * 4. Derive an unauthenticated connection (by shallow-cloning the original
 *    connection and replacing its headers with an empty object) and attempt to
 *    delete the legal hold target via DELETE
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets/{legalHoldTargetId}.
 *    This call must fail with an authorization error (e.g., 401/403).
 * 5. Finally, call the same DELETE endpoint again, but using the valid
 *    admin-authenticated connection. This call should succeed (no error).
 *
 * Validation:
 *
 * - All non-void responses (join, create legal hold, create target) are validated
 *   with typia.assert().
 * - The unauthorized delete call is wrapped with TestValidator.error and awaited
 *   to ensure it throws.
 * - The authorized delete call is awaited normally and must not throw.
 */
export async function test_api_legal_hold_target_deletion_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a legal hold using the authenticated admin connection
  const legalHoldBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.alphaNumeric(10),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBody,
    });
  typia.assert<IShoppingMallLegalHold>(legalHold);

  // 3. Create a legal hold target under that legal hold
  const legalHoldTargetBody = {
    target_type: "order",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    target_display: RandomGenerator.paragraph({ sentences: 2 }),
    note: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const legalHoldTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode: legalHold.code,
        body: legalHoldTargetBody,
      },
    );
  typia.assert<IShoppingMallLegalHoldTarget>(legalHoldTarget);

  // 4. Attempt to delete the target without valid admin authentication
  //    by using a fresh connection object with empty headers.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated delete of legal hold target must fail",
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.targets.erase(
        unauthenticatedConnection,
        {
          legalHoldCode: legalHold.code,
          legalHoldTargetId: legalHoldTarget.id,
        },
      );
    },
  );

  // 5. Delete the same target with the valid admin-authenticated connection
  await api.functional.shoppingMall.admin.legalHolds.targets.erase(connection, {
    legalHoldCode: legalHold.code,
    legalHoldTargetId: legalHoldTarget.id,
  });
}
