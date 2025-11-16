import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test that attempting to retrieve session security information for a different
 * user is properly blocked. Validates authorization enforcement that prevents
 * users from accessing other accounts' security information, ensuring privacy
 * protection and proper access control implementation.
 */
export async function test_api_user_session_security_retrieval_different_user_blocked(
  connection: api.IConnection,
) {
  // Step 1: Create primary user account with unique credentials
  const primaryUserEmail = typia.random<string & tags.Format<"email">>();
  const primaryUserPassword = RandomGenerator.alphaNumeric(8);
  const primaryUser = await api.functional.auth.user.join(connection, {
    body: {
      email: primaryUserEmail,
      password: primaryUserPassword,
      ip: "127.0.0.1",
      href: "https://example.com",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(primaryUser);

  // Step 2: Create secondary user account for cross-user testing
  const secondaryUserEmail = typia.random<string & tags.Format<"email">>();
  const secondaryUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondaryUserEmail,
      password: RandomGenerator.alphaNumeric(8),
      ip: "127.0.0.1",
      href: "https://example.com",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(secondaryUser);

  // Step 3: Login as primary user to establish authentication context
  const authenticatedPrimaryUser = await api.functional.auth.user.login(
    connection,
    {
      body: {
        email: primaryUserEmail,
        password: primaryUserPassword,
        ip: "127.0.0.1",
        href: "https://example.com",
        referrer: "https://example.com/home",
      } satisfies ITodoAppUser.ILogin,
    },
  );
  typia.assert(authenticatedPrimaryUser);

  // Step 4: Attempt to retrieve secondary user's security information as primary user
  // This should be blocked by authorization enforcement
  await TestValidator.error(
    "retrieving another user's security data should be blocked",
    async () => {
      return await api.functional.todoApp.user.auth.users.security.at(
        connection,
        {
          userId: secondaryUser.id,
        },
      );
    },
  );

  // Step 5: Verify that primary user can access their own security information
  const primaryUserSecurity =
    await api.functional.todoApp.user.auth.users.security.at(connection, {
      userId: primaryUser.id,
    });
  typia.assert(primaryUserSecurity);

  // Validate that the primary user's security data structure is valid
  TestValidator.predicate(
    "primary user security data should be valid",
    primaryUserSecurity.data.every(
      (session) => session.user_id === primaryUser.id,
    ),
  );
}
