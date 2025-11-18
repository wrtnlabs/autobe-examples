import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

export async function test_api_todo_list_admin_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user joins (registers) to authenticate and obtain token
  const adminCreateRequest = {
    email: RandomGenerator.alphaNumeric(6) + "@example.com",
    password: "securePassword123",
  } satisfies ITodoListAdmin.ICreate;

  const authorizedAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateRequest,
    });
  typia.assert(authorizedAdmin);

  // Step 2: Prepare update request to change email
  const newEmail = RandomGenerator.alphaNumeric(8) + "@example.com";
  const now = new Date().toISOString();

  const updateBody: ITodoListAdmin.IUpdate = {
    email: newEmail,
    // Explicitly pass created_at, updated_at, deleted_at as null for update validation
    created_at: authorizedAdmin.created_at,
    updated_at: now,
    deleted_at: null,
  };

  // Step 3: Perform update operation
  const updatedAdmin: ITodoListAdmin =
    await api.functional.todoList.admin.todoListAdmins.update(connection, {
      id: authorizedAdmin.id,
      body: updateBody,
    });
  typia.assert(updatedAdmin);

  // Step 4: Validate updated email matches
  TestValidator.equals(
    "updated email should match",
    updatedAdmin.email,
    newEmail,
  );

  // Step 5: Validate timestamps: created_at unchanged, updated_at recent, deleted_at null
  TestValidator.equals(
    "created_at should not change",
    updatedAdmin.created_at,
    authorizedAdmin.created_at,
  );
  TestValidator.predicate(
    "updated_at should be after previous updated_at",
    updatedAdmin.updated_at >= authorizedAdmin.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null after update",
    updatedAdmin.deleted_at,
    null,
  );

  // Step 6: Mark account deleted by setting deleted_at to current timestamp
  const deletionTimestamp = new Date().toISOString();
  const updateDeletedBody: ITodoListAdmin.IUpdate = {
    email: newEmail,
    created_at: authorizedAdmin.created_at,
    updated_at: deletionTimestamp,
    deleted_at: deletionTimestamp,
  };

  const deletedAdmin: ITodoListAdmin =
    await api.functional.todoList.admin.todoListAdmins.update(connection, {
      id: authorizedAdmin.id,
      body: updateDeletedBody,
    });
  typia.assert(deletedAdmin);

  // Step 7: Validate deleted_at timestamp is set
  TestValidator.equals(
    "deleted_at is set after marking deleted",
    deletedAdmin.deleted_at,
    deletionTimestamp,
  );
}
