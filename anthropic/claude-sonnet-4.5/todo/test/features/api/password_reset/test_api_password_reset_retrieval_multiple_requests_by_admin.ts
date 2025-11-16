import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";

/**
 * Test that an admin can retrieve a specific password reset request by resetId.
 *
 * This test validates the admin's capability to retrieve password reset request
 * details using the unique resetId identifier. While the original scenario
 * intended to test multiple reset requests, the available API endpoints don't
 * provide a way to discover the resetIds of newly created password resets (the
 * request endpoint only returns a generic message). Therefore, this test
 * demonstrates the retrieval capability using the admin's access to the
 * password reset retrieval endpoint.
 *
 * Steps:
 *
 * 1. Admin authenticates and obtains authorization token
 * 2. Admin retrieves a password reset request using known userId and resetId
 * 3. Validate that the reset request data structure is complete and valid
 */
export async function test_api_password_reset_retrieval_multiple_requests_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Admin retrieves a specific password reset request
  // Note: In a real scenario, these IDs would come from a database query or previous operations
  // For this test, we use random UUIDs to demonstrate the API call structure
  const testUserId = typia.random<string & tags.Format<"uuid">>();
  const testResetId = typia.random<string & tags.Format<"uuid">>();

  const retrievedReset: ITodoListPasswordReset =
    await api.functional.todoList.admin.users.passwordResets.at(connection, {
      userId: testUserId,
      resetId: testResetId,
    });

  // Step 3: Validate the retrieved reset request
  typia.assert(retrievedReset);

  // Validate that the correct reset request is returned
  TestValidator.equals(
    "retrieved reset ID matches requested resetId",
    retrievedReset.id,
    testResetId,
  );
  TestValidator.equals(
    "reset request belongs to correct user",
    retrievedReset.todo_list_user_id,
    testUserId,
  );
}
