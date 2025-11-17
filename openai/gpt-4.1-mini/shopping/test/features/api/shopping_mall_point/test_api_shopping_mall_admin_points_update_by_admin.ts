import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPoint";

/**
 * Validate updating a customer loyalty point by an authorized admin.
 *
 * This test simulates the following business flow:
 *
 * 1. Admin account registration via /auth/admin/join to obtain authorization token
 * 2. Update an existing customer loyalty point record by its UUID via PUT
 *    /shoppingMall/admin/points/{pointId}
 * 3. Validate update response fields and business logic including balance update
 *    and soft deletion timestamp.
 *
 * The test ensures that only authorized admins can update points, updates are
 * correctly persisted, and soft deletion can be toggled.
 *
 * All API calls must await the promises and use typia.assert to verify response
 * types.
 */
export async function test_api_shopping_mall_admin_points_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    ip: null,
    href: "https://example.com/admin/join",
    referrer: "https://example.com",
  } satisfies IShoppingMallAdmin.IJoin;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // 2. Simulate existing point record ID
  const pointId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare update body with new balance and deleted_at toggle
  const updateBody1 = {
    balance: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    deleted_at: null,
  } satisfies IShoppingMallPoint.IUpdate;

  // Update point record with new balance and null deleted_at (restore if soft deleted)
  const updatedPoint1: IShoppingMallPoint =
    await api.functional.shoppingMall.admin.points.update(connection, {
      pointId,
      body: updateBody1,
    });
  typia.assert(updatedPoint1);
  TestValidator.equals(
    "balance equals updated balance",
    updatedPoint1.balance,
    updateBody1.balance,
  );
  TestValidator.equals(
    "deleted_at is null after restore",
    updatedPoint1.deleted_at,
    null,
  );

  // 4. Update point with soft delete timestamp
  const deletedAt = new Date().toISOString();
  const updateBody2 = {
    deleted_at: deletedAt,
  } satisfies IShoppingMallPoint.IUpdate;

  const updatedPoint2: IShoppingMallPoint =
    await api.functional.shoppingMall.admin.points.update(connection, {
      pointId,
      body: updateBody2,
    });
  typia.assert(updatedPoint2);
  TestValidator.equals(
    "deleted_at reflects soft deletion timestamp",
    updatedPoint2.deleted_at,
    deletedAt,
  );

  // 5. Update point with balance only
  const updateBody3 = {
    balance: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IShoppingMallPoint.IUpdate;

  const updatedPoint3: IShoppingMallPoint =
    await api.functional.shoppingMall.admin.points.update(connection, {
      pointId,
      body: updateBody3,
    });
  typia.assert(updatedPoint3);
  TestValidator.equals(
    "balance equals updated balance only",
    updatedPoint3.balance,
    updateBody3.balance,
  );
}
