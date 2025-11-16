import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that attempting to update security settings for a different user is
 * blocked. Validates authorization enforcement preventing users from modifying
 * other accounts' security settings, ensuring account integrity and preventing
 * unauthorized security modifications.
 *
 * 1. Create primary user account for ownership testing
 * 2. Create secondary user account to test cross-user access prevention
 * 3. Login as primary user to establish authentication context
 * 4. Attempt to update secondary user's security settings (should fail)
 * 5. Verify that primary user can update their own security settings (optional
 *    verification)
 */
export async function test_api_user_security_update_cross_user_blocked(
  connection: api.IConnection,
) {
  // Create primary user account
  const primaryEmail = typia.random<string & tags.Format<"email">>();
  const primaryUser = await api.functional.auth.user.join(connection, {
    body: {
      email: primaryEmail,
      password: "PrimaryUser123!",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(primaryUser);

  // Create secondary user account
  const secondaryEmail = typia.random<string & tags.Format<"email">>();
  const secondaryUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondaryEmail,
      password: "SecondaryUser456!",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(secondaryUser);

  // Login as primary user
  await api.functional.auth.user.login(connection, {
    body: {
      email: primaryEmail,
      password: "PrimaryUser123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/join",
    } satisfies ITodoAppUser.ILogin,
  });

  // Attempt to update secondary user's security settings - this should fail
  await TestValidator.error(
    "updating other user's security settings should be blocked",
    async () => {
      await api.functional.todoApp.user.auth.users.security.updateSecurity(
        connection,
        {
          userId: secondaryUser.id,
          body: {
            password_hash: "NewPassword789!",
          } satisfies ITodoAppUser.IUpdate,
        },
      );
    },
  );

  // Verify primary user can update their own security settings
  await api.functional.todoApp.user.auth.users.security.updateSecurity(
    connection,
    {
      userId: primaryUser.id,
      body: {
        password_hash: "UpdatedPassword123!",
      } satisfies ITodoAppUser.IUpdate,
    },
  );
}
