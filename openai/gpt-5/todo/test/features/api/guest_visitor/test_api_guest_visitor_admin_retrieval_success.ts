import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuestVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestVisitor";
import type { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";

export async function test_api_guest_visitor_admin_retrieval_success(
  connection: api.IConnection,
) {
  /**
   * Validate that a system admin can retrieve a Guest Visitor by UUID.
   *
   * Flow:
   *
   * 1. Create a guest visitor (public join) to obtain a valid guestVisitorId
   * 2. Join as systemAdmin (sets admin Authorization token)
   * 3. GET the guest visitor by id via admin-only endpoint
   * 4. Validate identity and timestamp invariants
   */

  // 1) Create Guest Visitor to obtain a valid id (public endpoint)
  const guestAuth: ITodoListGuestVisitor.IAuthorized =
    await api.functional.auth.guestVisitor.join(connection, {
      body: {} satisfies ITodoListGuestVisitor.ICreate,
    });
  typia.assert(guestAuth);

  const guestVisitorId: string & tags.Format<"uuid"> = guestAuth.id;

  // 2) Join as System Admin to acquire admin Authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
  } satisfies ITodoListSystemAdmin.ICreate;

  const adminAuth: ITodoListSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 3) GET the Guest Visitor by id as admin
  const retrieved: ITodoListGuestVisitor =
    await api.functional.todoList.systemAdmin.guestVisitors.at(connection, {
      guestVisitorId,
    });
  typia.assert(retrieved);

  // 4) Business logic validations
  TestValidator.equals(
    "retrieved guest id matches created guest id",
    retrieved.id,
    guestVisitorId,
  );

  // created_at should match the original creation time from the join response
  TestValidator.equals(
    "retrieved.created_at equals guestAuth.created_at",
    retrieved.created_at,
    guestAuth.created_at,
  );

  // updated_at should be parsable and >= created_at
  const createdAtMs = new Date(retrieved.created_at).getTime();
  const updatedAtMs = new Date(retrieved.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is greater than or equal to created_at",
    updatedAtMs >= createdAtMs,
  );

  // deleted_at must be null or undefined for a fresh active record
  TestValidator.predicate(
    "deleted_at is null or undefined for active guest visitor",
    retrieved.deleted_at === null || retrieved.deleted_at === undefined,
  );
}
