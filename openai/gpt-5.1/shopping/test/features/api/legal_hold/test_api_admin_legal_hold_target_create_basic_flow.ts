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
 * Basic happy-path flow for creating a legal hold target under an existing
 * legal hold.
 *
 * Business flow validated by this test:
 *
 * 1. Register an admin account using POST /auth/admin/join and obtain an
 *    authenticated context.
 * 2. Create a legal hold record via POST /shoppingMall/admin/legalHolds.
 * 3. Create a new legal hold target under that legal hold using its business code
 *    as path parameter.
 * 4. Verify that the created target correctly references the parent legal hold and
 *    echoes request payload fields.
 */
export async function test_api_admin_legal_hold_target_create_basic_flow(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a legal hold
  const legalHoldCodePrefix = "LH-CUST-";
  const legalHoldCodeSuffix = RandomGenerator.alphaNumeric(8);
  const legalHoldCreateBody = {
    code: `${legalHoldCodePrefix}${legalHoldCodeSuffix}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: `CASE-${RandomGenerator.alphaNumeric(10)}`,
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldCreateBody,
    });
  typia.assert<IShoppingMallLegalHold>(legalHold);

  // 3. Prepare legal hold target payload
  const targetId = typia.random<string & tags.Format<"uuid">>();
  const targetDisplay = typia.random<string & tags.Format<"email">>();
  const targetNote = RandomGenerator.paragraph({ sentences: 5 });

  const legalHoldTargetCreateBody = {
    target_type: "customer",
    target_id: targetId,
    target_display: targetDisplay,
    note: targetNote,
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  // 4. Create legal hold target under the created legal hold
  const legalHoldTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode: legalHold.code,
        body: legalHoldTargetCreateBody,
      },
    );
  typia.assert<IShoppingMallLegalHoldTarget>(legalHoldTarget);

  // 5. Business validations
  // 5-1. Parent legal hold reference should match created legal hold id
  TestValidator.equals(
    "legal hold target must reference the parent legal hold id",
    legalHoldTarget.shopping_mall_legal_hold_id,
    legalHold.id,
  );

  // 5-2. Echo fields validation: ensure response fields match request payload
  TestValidator.equals(
    "target_type must match request payload",
    legalHoldTarget.target_type,
    legalHoldTargetCreateBody.target_type,
  );

  TestValidator.equals(
    "target_id must match request payload",
    legalHoldTarget.target_id,
    legalHoldTargetCreateBody.target_id,
  );

  TestValidator.equals(
    "target_display must match request payload",
    legalHoldTarget.target_display ?? null,
    legalHoldTargetCreateBody.target_display ?? null,
  );

  TestValidator.equals(
    "note must match request payload",
    legalHoldTarget.note ?? null,
    legalHoldTargetCreateBody.note ?? null,
  );

  // 5-3. created_at should be a non-empty date-time string (already type-validated by typia)
  TestValidator.predicate(
    "created_at must be a non-empty date-time string",
    () => legalHoldTarget.created_at.length > 0,
  );
}
