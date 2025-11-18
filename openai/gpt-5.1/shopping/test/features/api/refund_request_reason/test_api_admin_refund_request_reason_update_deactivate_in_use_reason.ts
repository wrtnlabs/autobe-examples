import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Validate that an admin can deactivate an active refund request reason without
 * changing its identity fields, and that updated_at is advanced.
 *
 * Business steps:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated
 *    context.
 * 2. Create an active refund request reason via POST
 *    /shoppingMall/admin/refundRequestReasons with is_active=true and both
 *    applies_to_cancellation/applies_to_refund true.
 * 3. Remember id, code, created_at and the original updated_at.
 * 4. Call PUT /shoppingMall/admin/refundRequestReasons/{reasonCode} with body {
 *    is_active: false } so only the activation flag changes.
 * 5. Assert that id, code, created_at remain the same, is_active is false, and
 *    updated_at is different from the original value.
 * 6. Also confirm that applicability flags were not unintentionally modified.
 */
export async function test_api_admin_refund_request_reason_update_deactivate_in_use_reason(
  connection: api.IConnection,
) {
  // 1. Join an admin to get an authenticated admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shopping-mall.example.com/join",
    referrer: "https://shopping-mall.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an active refund request reason.
  const createBody = {
    code: `reason_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    applies_to_cancellation: true,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  const created: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallRefundRequestReason>(created);

  // Capture immutable and reference fields.
  const originalId: string & tags.Format<"uuid"> = created.id;
  const originalCode: string = created.code;
  const originalCreatedAt: string & tags.Format<"date-time"> =
    created.created_at;
  const originalUpdatedAt: string & tags.Format<"date-time"> =
    created.updated_at;
  const originalAppliesToCancellation: boolean =
    created.applies_to_cancellation;
  const originalAppliesToRefund: boolean = created.applies_to_refund;

  // 3. Deactivate the reason via update (only toggling is_active to false).
  const updateBody = {
    is_active: false,
  } satisfies IShoppingMallRefundRequestReason.IUpdate;

  const updated: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.update(
      connection,
      {
        reasonCode: originalCode,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallRefundRequestReason>(updated);

  // 4. Identity fields must be preserved.
  TestValidator.equals(
    "id must remain unchanged after deactivation",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "code must remain unchanged after deactivation",
    updated.code,
    originalCode,
  );
  TestValidator.equals(
    "created_at must remain unchanged after deactivation",
    updated.created_at,
    originalCreatedAt,
  );

  // 5. is_active must now be false.
  TestValidator.equals(
    "reason must be deactivated (is_active=false)",
    updated.is_active,
    false,
  );

  // 6. updated_at should advance (at least differ) after the update.
  TestValidator.notEquals(
    "updated_at should change when deactivating reason",
    updated.updated_at,
    originalUpdatedAt,
  );

  // 7. Applicability flags should not be unintentionally modified.
  TestValidator.equals(
    "applies_to_cancellation flag must remain unchanged",
    updated.applies_to_cancellation,
    originalAppliesToCancellation,
  );
  TestValidator.equals(
    "applies_to_refund flag must remain unchanged",
    updated.applies_to_refund,
    originalAppliesToRefund,
  );
}
