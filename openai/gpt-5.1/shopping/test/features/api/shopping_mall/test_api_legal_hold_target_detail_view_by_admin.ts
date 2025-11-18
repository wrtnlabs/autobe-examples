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
 * Validate that an authenticated admin can view full details of a specific
 * legal hold target that was just created under a legal hold.
 *
 * Business purpose:
 *
 * - Ensure governance/administration users can inspect the detailed scope of a
 *   legal hold by retrieving the exact target row (link between a hold and a
 *   concrete business entity).
 * - Confirm that the retrieval endpoint resolves the legal hold by its business
 *   `code` and the target by its UUID primary key.
 *
 * Scenario steps:
 *
 * 1. Join a new admin account using POST /auth/admin/join.
 * 2. As that admin, create a legal hold using POST /shoppingMall/admin/legalHolds.
 * 3. Under that legal hold, create a legal hold target via POST
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets.
 * 4. Retrieve the target details via GET
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets/{legalHoldTargetId}.
 * 5. Assert that the returned target matches the created one and that it is linked
 *    to the correct parent legal hold.
 */
export async function test_api_legal_hold_target_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join / authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a legal hold under this admin
  const legalHoldCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 5 }),
    external_reference: RandomGenerator.alphaNumeric(16),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldCreateBody,
    });
  typia.assert(legalHold);

  const legalHoldCode: string = legalHold.code;
  const legalHoldId: string & tags.Format<"uuid"> = legalHold.id;

  // 3. Create a legal hold target for this legal hold
  const targetCreateBody = {
    target_type: "customer",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    target_display: RandomGenerator.paragraph({ sentences: 4 }),
    note: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const createdTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode,
        body: targetCreateBody,
      },
    );
  typia.assert(createdTarget);

  const legalHoldTargetId: string & tags.Format<"uuid"> = createdTarget.id;

  // 4. Retrieve the legal hold target details
  const fetchedTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.at(connection, {
      legalHoldCode,
      legalHoldTargetId,
    });
  typia.assert(fetchedTarget);

  // 5. Business/linkage assertions
  TestValidator.equals(
    "fetched target id should match created target id",
    fetchedTarget.id,
    createdTarget.id,
  );
  TestValidator.equals(
    "fetched target_type should match created target_type",
    fetchedTarget.target_type,
    createdTarget.target_type,
  );
  TestValidator.equals(
    "fetched target_id should match created target_id",
    fetchedTarget.target_id,
    createdTarget.target_id,
  );
  TestValidator.equals(
    "fetched target_display should match created target_display",
    fetchedTarget.target_display,
    createdTarget.target_display,
  );
  TestValidator.equals(
    "fetched note should match created note",
    fetchedTarget.note,
    createdTarget.note,
  );
  TestValidator.equals(
    "fetched shopping_mall_legal_hold_id should link to the created legal hold id",
    fetchedTarget.shopping_mall_legal_hold_id,
    legalHoldId,
  );
}
