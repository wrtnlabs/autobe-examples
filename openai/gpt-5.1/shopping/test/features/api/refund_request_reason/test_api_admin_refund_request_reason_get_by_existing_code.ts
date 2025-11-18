import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Validate that an authenticated admin can retrieve a refund request reason by
 * its business code.
 *
 * Business flow:
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authenticated
 *    admin context.
 * 2. Create a new refund request reason via POST
 *    /shoppingMall/admin/refundRequestReasons with a distinctive code.
 * 3. Fetch the refund request reason via GET
 *    /shoppingMall/admin/refundRequestReasons/{reasonCode} using the created
 *    code.
 * 4. Verify that all configuration fields in the GET response match those from the
 *    create response/payload.
 * 5. Call GET again and assert that created_at and updated_at timestamps remain
 *    unchanged, confirming read-only behavior.
 */
export async function test_api_admin_refund_request_reason_get_by_existing_code(
  connection: api.IConnection,
) {
  // 1. Register a new admin (join) to obtain an authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a new refund request reason with a distinctive code
  const reasonCodePrefix = "DAMAGED_ITEM_";
  const reasonCodeSuffix = RandomGenerator.alphaNumeric(8);
  const reasonCode = `${reasonCodePrefix}${reasonCodeSuffix}`;

  const createBody = {
    code: reasonCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
  typia.assert(created);

  // Basic invariants between create payload and created entity
  TestValidator.equals(
    "created reason code matches payload",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created reason name matches payload",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created reason description matches payload",
    created.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "created reason applies_to_cancellation matches payload",
    created.applies_to_cancellation,
    createBody.applies_to_cancellation,
  );
  TestValidator.equals(
    "created reason applies_to_refund matches payload",
    created.applies_to_refund,
    createBody.applies_to_refund,
  );
  TestValidator.equals(
    "created reason is_active matches payload",
    created.is_active,
    createBody.is_active,
  );

  // 3. Fetch the refund request reason by its business code
  const fetchedOnce: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.at(
      connection,
      {
        reasonCode,
      },
    );
  typia.assert(fetchedOnce);

  // Validate that fetched entity matches created entity for key business fields
  TestValidator.equals(
    "fetched reason id matches created",
    fetchedOnce.id,
    created.id,
  );
  TestValidator.equals(
    "fetched reason code matches created",
    fetchedOnce.code,
    created.code,
  );
  TestValidator.equals(
    "fetched reason name matches created",
    fetchedOnce.name,
    created.name,
  );
  TestValidator.equals(
    "fetched reason description matches created",
    fetchedOnce.description ?? null,
    created.description ?? null,
  );
  TestValidator.equals(
    "fetched reason applies_to_cancellation matches created",
    fetchedOnce.applies_to_cancellation,
    created.applies_to_cancellation,
  );
  TestValidator.equals(
    "fetched reason applies_to_refund matches created",
    fetchedOnce.applies_to_refund,
    created.applies_to_refund,
  );
  TestValidator.equals(
    "fetched reason is_active matches created",
    fetchedOnce.is_active,
    created.is_active,
  );

  // 4. Call GET again to confirm read-only behavior (timestamps don't change)
  const fetchedTwice: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.at(
      connection,
      {
        reasonCode,
      },
    );
  typia.assert(fetchedTwice);

  // Confirm business fields remain identical across repeated GET calls
  TestValidator.equals(
    "second fetch reason id equals first fetch",
    fetchedTwice.id,
    fetchedOnce.id,
  );
  TestValidator.equals(
    "second fetch reason code equals first fetch",
    fetchedTwice.code,
    fetchedOnce.code,
  );
  TestValidator.equals(
    "second fetch reason name equals first fetch",
    fetchedTwice.name,
    fetchedOnce.name,
  );
  TestValidator.equals(
    "second fetch reason description equals first fetch",
    fetchedTwice.description ?? null,
    fetchedOnce.description ?? null,
  );
  TestValidator.equals(
    "second fetch applies_to_cancellation equals first fetch",
    fetchedTwice.applies_to_cancellation,
    fetchedOnce.applies_to_cancellation,
  );
  TestValidator.equals(
    "second fetch applies_to_refund equals first fetch",
    fetchedTwice.applies_to_refund,
    fetchedOnce.applies_to_refund,
  );
  TestValidator.equals(
    "second fetch is_active equals first fetch",
    fetchedTwice.is_active,
    fetchedOnce.is_active,
  );

  // Confirm read-only by asserting timestamps remain identical across GET calls
  TestValidator.equals(
    "created_at remains stable across repeated GET calls",
    fetchedTwice.created_at,
    fetchedOnce.created_at,
  );
  TestValidator.equals(
    "updated_at remains stable across repeated GET calls",
    fetchedTwice.updated_at,
    fetchedOnce.updated_at,
  );
}
