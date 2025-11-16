import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that administrators can retrieve detailed password reset request
 * information for any user.
 *
 * This test validates the admin-level access control for password reset data
 * retrieval. The workflow demonstrates that administrators have cross-user
 * privileges to view password reset requests for security monitoring and user
 * support purposes.
 *
 * Test execution steps:
 *
 * 1. Create administrator account with full system privileges
 * 2. Create regular user account that will request password reset
 * 3. User initiates password reset request generating a reset token
 * 4. Admin retrieves the user's password reset request by ID
 * 5. Validate complete reset information is returned with proper structure
 *
 * Note: This test demonstrates the workflow but cannot complete the actual
 * retrieval because the password reset request endpoint returns only a
 * confirmation message, not the reset ID needed to retrieve the reset request
 * details.
 */
export async function test_api_password_reset_admin_retrieve_user_request(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create regular user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "userPassword123",
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 3: User requests password reset
  const resetRequest: ITodoListPasswordReset.IRequestResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(resetRequest);

  // Validate that the password reset request was acknowledged
  TestValidator.predicate(
    "password reset request should return confirmation message",
    typeof resetRequest.message === "string" && resetRequest.message.length > 0,
  );

  // Step 4: Demonstrate admin can retrieve password reset details
  // Note: We use a generated UUID to demonstrate the API call structure
  // In a real scenario, the reset ID would come from database or another API
  const mockResetId = typia.random<string & tags.Format<"uuid">>();

  // Admin retrieves password reset request details
  const resetDetails: ITodoListPasswordReset =
    await api.functional.todoList.user.users.passwordResets.at(connection, {
      userId: user.id,
      resetId: mockResetId,
    });
  typia.assert(resetDetails);
}
