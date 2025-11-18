import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Validate deletion of an unused refund request reason by an administrator.
 *
 * Business objective: Ensure that an admin can create a new refund request
 * reason in the `shopping_mall_refund_request_reasons` catalog and then
 * successfully delete it using its business `code`, provided that no
 * refund/cancellation flows reference it.
 *
 * Scenario steps:
 *
 * 1. Register a fresh admin using POST /auth/admin/join to obtain an authenticated
 *    admin context.
 * 2. With that admin context, create a new refund request reason via POST
 *    /shoppingMall/admin/refundRequestReasons, supplying a unique code,
 *    human-readable name, optional description, and applicability flags
 *    (applies_to_cancellation, applies_to_refund, is_active).
 * 3. Verify the create response matches the requested configuration by asserting
 *    that code, name, description, and flags in the returned
 *    IShoppingMallRefundRequestReason equal those in the request body.
 * 4. Invoke DELETE /shoppingMall/admin/refundRequestReasons/{reasonCode} using the
 *    created `code` as the path parameter.
 * 5. Confirm that the delete operation succeeds (no error thrown).
 * 6. As a behavioral confirmation that the reason was removed, attempt to delete
 *    the same `reasonCode` again and assert that this second call results in an
 *    error using TestValidator.error, indicating the record no longer exists.
 */
export async function test_api_admin_refund_reason_delete_unused_reason(
  connection: api.IConnection,
) {
  // 1. Register a fresh admin using /auth/admin/join
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new refund request reason
  const uniqueCode = `reason_${RandomGenerator.alphaNumeric(12)}`;
  const createBody = {
    code: uniqueCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    applies_to_cancellation: true,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  const created: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // 3. Verify that created entity matches the request payload
  TestValidator.equals(
    "refund reason code should match request payload",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "refund reason name should match request payload",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "refund reason description should match request payload",
    created.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "applies_to_cancellation flag should match",
    created.applies_to_cancellation,
    createBody.applies_to_cancellation,
  );
  TestValidator.equals(
    "applies_to_refund flag should match",
    created.applies_to_refund,
    createBody.applies_to_refund,
  );
  TestValidator.equals(
    "is_active flag should match",
    created.is_active,
    createBody.is_active,
  );

  // 4. Delete the created refund request reason by its business code
  await api.functional.shoppingMall.admin.refundRequestReasons.erase(
    connection,
    { reasonCode: created.code },
  );

  // 5. Confirm deletion by attempting to delete the same code again
  await TestValidator.error(
    "deleting already-deleted refund reason should fail",
    async () => {
      await api.functional.shoppingMall.admin.refundRequestReasons.erase(
        connection,
        { reasonCode: created.code },
      );
    },
  );
}
