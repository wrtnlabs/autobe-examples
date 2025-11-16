import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";

/**
 * Test admin retrieval of password reset request details.
 *
 * Validates that an admin can successfully retrieve detailed information about
 * a specific password reset request for security auditing and user support
 * purposes.
 *
 * Steps:
 *
 * 1. Admin authenticates to obtain admin privileges
 * 2. User initiates password reset request (creates reset token)
 * 3. Admin retrieves password reset details using userId and resetId
 * 4. Validate response contains complete reset information
 */
export async function test_api_password_reset_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: User initiates password reset request
  const userEmail = typia.random<string & tags.Format<"email">>();

  const resetRequestResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(resetRequestResult);

  // Step 3: Admin retrieves password reset details
  const userId = typia.random<string & tags.Format<"uuid">>();
  const resetId = typia.random<string & tags.Format<"uuid">>();

  const passwordReset =
    await api.functional.todoList.admin.users.passwordResets.at(connection, {
      userId: userId,
      resetId: resetId,
    });
  typia.assert(passwordReset);
}
