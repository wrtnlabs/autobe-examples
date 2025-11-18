import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Validate updating mutable fields of a refund request reason by admin.
 *
 * Business workflow:
 *
 * 1. Register an admin via /auth/admin/join and establish authenticated context.
 * 2. As that admin, create a baseline refund request reason via POST
 *    /shoppingMall/admin/refundRequestReasons.
 * 3. Update the reason via PUT
 *    /shoppingMall/admin/refundRequestReasons/{reasonCode}, changing name,
 *    description, and applicability / activation flags.
 * 4. Verify immutability of id/code/created_at and correctness of updated fields
 *    and updated_at audit timestamp.
 */
export async function test_api_admin_refund_request_reason_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create baseline refund request reason
  const createBody = typia.random<IShoppingMallRefundRequestReason.ICreate>();
  const created: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  const originalId = created.id;
  const originalCode = created.code;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // Prepare explicit update fields so we can assert precise values
  const updatedName = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedAppliesToCancellation = !created.applies_to_cancellation;
  const updatedAppliesToRefund = !created.applies_to_refund;
  const updatedIsActive = !created.is_active;

  const updateBody: IShoppingMallRefundRequestReason.IUpdate = {
    name: updatedName,
    description: updatedDescription,
    applies_to_cancellation: updatedAppliesToCancellation,
    applies_to_refund: updatedAppliesToRefund,
    is_active: updatedIsActive,
  };

  // 3. Call update with reasonCode path param
  const updated: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.update(
      connection,
      {
        reasonCode: originalCode,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Validate immutability of identity fields
  TestValidator.equals(
    "refund request reason id remains immutable",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "refund request reason code remains immutable",
    updated.code,
    originalCode,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );

  // 5. Validate updated fields reflect request body
  TestValidator.notEquals(
    "name is updated from original value",
    updated.name,
    created.name,
  );
  TestValidator.equals(
    "name matches value provided in update payload",
    updated.name,
    updatedName,
  );

  TestValidator.notEquals(
    "description is updated from original value",
    updated.description,
    created.description ?? null,
  );
  TestValidator.equals(
    "description matches value provided in update payload",
    updated.description,
    updatedDescription,
  );

  TestValidator.equals(
    "applies_to_cancellation flag matches update payload",
    updated.applies_to_cancellation,
    updatedAppliesToCancellation,
  );
  TestValidator.equals(
    "applies_to_refund flag matches update payload",
    updated.applies_to_refund,
    updatedAppliesToRefund,
  );
  TestValidator.equals(
    "is_active flag matches update payload",
    updated.is_active,
    updatedIsActive,
  );

  // 6. Validate updated_at is later than original updated_at
  const originalUpdatedAtTime = new Date(originalUpdatedAt).getTime();
  const updatedUpdatedAtTime = new Date(updated.updated_at).getTime();

  TestValidator.predicate(
    "updated_at should be strictly later than original updated_at",
    updatedUpdatedAtTime > originalUpdatedAtTime,
  );
}
