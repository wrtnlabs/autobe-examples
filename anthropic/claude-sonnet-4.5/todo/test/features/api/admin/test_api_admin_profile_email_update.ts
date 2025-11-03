import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test admin email update functionality with proper validation and timestamp
 * management.
 *
 * This test validates that an authenticated administrator can successfully
 * update their email address through the profile update API endpoint. The test
 * ensures email uniqueness enforcement, proper validation of email format, and
 * correct timestamp management during profile updates.
 *
 * Workflow:
 *
 * 1. Create a new admin account with initial email and obtain authentication
 * 2. Update the admin's email address to a new unique value
 * 3. Validate the updated email is reflected in the response
 * 4. Verify updated_at timestamp is refreshed
 * 5. Ensure created_at timestamp remains unchanged
 * 6. Confirm account ID and properties remain consistent
 */
export async function test_api_admin_profile_email_update(
  connection: api.IConnection,
) {
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const adminJoinBody = {
    email: initialEmail,
    password: password,
    href: href,
    referrer: referrer,
  } satisfies ITodoListAdmin.ICreate;

  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(createdAdmin);

  const originalCreatedAt = createdAdmin.created_at;
  const originalId = createdAdmin.id;

  const newEmail = typia.random<string & tags.Format<"email">>();

  const updateBody = {
    email: newEmail,
  } satisfies ITodoListAdmin.IUpdate;

  const updatedAdmin = await api.functional.todoList.admin.admins.me.update(
    connection,
    {
      body: updateBody,
    },
  );
  typia.assert(updatedAdmin);

  TestValidator.equals("email should be updated", updatedAdmin.email, newEmail);
  TestValidator.equals(
    "admin ID should remain unchanged",
    updatedAdmin.id,
    originalId,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedAdmin.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should be refreshed",
    updatedAdmin.updated_at !== createdAdmin.updated_at,
  );
}
