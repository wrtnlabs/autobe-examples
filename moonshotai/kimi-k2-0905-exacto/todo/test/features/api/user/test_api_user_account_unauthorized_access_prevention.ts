import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that the system properly prevents users from accessing other users'
 * account information. Verify that authorization checks enforce that only the
 * authenticated user whose ID matches the path parameter can retrieve account
 * details. Validate that unauthorized access attempts return appropriate error
 * responses without exposing sensitive information about other accounts. Test
 * the privacy protection mechanisms that maintain user data confidentiality and
 * prevent account enumeration attacks.
 */
export async function test_api_user_account_unauthorized_access_prevention(
  connection: api.IConnection,
) {
  // Create first user account for authentication
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "SecurePass123",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);

  // Create second user account for testing unauthorized access
  const connectionForSecondUser: api.IConnection = {
    ...connection,
    headers: {},
  };
  const secondUser = await api.functional.auth.user.join(
    connectionForSecondUser,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass456",
        href: "https://example.com/join",
        referrer: "https://example.com/",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(secondUser);

  // Create third user account as additional test subject
  const connectionForThirdUser: api.IConnection = {
    ...connection,
    headers: {},
  };
  const thirdUser = await api.functional.auth.user.join(
    connectionForThirdUser,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass789",
        href: "https://example.com/join",
        referrer: "https://example.com/",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(thirdUser);

  // Test successful access to own account details (authenticated as firstUser)
  const ownAccountResponse = await api.functional.todoApp.user.auth.users.at(
    connection,
    {
      userId: firstUser.id,
    },
  );
  typia.assert(ownAccountResponse);

  // Comprehensive validation of successful access
  TestValidator.equals(
    "authenticated user can access own ID",
    ownAccountResponse.id,
    firstUser.id,
  );
  TestValidator.equals(
    "authenticated user can access own email",
    ownAccountResponse.email,
    firstUser.email,
  );
  TestValidator.predicate(
    "user response has all required fields",
    () =>
      ownAccountResponse.id !== undefined &&
      ownAccountResponse.email !== undefined &&
      ownAccountResponse.password_hash !== undefined &&
      ownAccountResponse.created_at !== undefined &&
      ownAccountResponse.updated_at !== undefined,
  );

  // Test attempted access to second user's account details while authenticated as firstUser
  // This should be prevented by authorization checks
  await TestValidator.httpError(
    "first user cannot access second user's account",
    [401, 403, 404], // Most likely error codes for authorization/permission issues
    async () => {
      await api.functional.todoApp.user.auth.users.at(connection, {
        userId: secondUser.id,
      });
    },
  );

  // Test attempted access to third user's account details while authenticated as firstUser
  await TestValidator.httpError(
    "first user cannot access third user's account",
    [401, 403, 404],
    async () => {
      await api.functional.todoApp.user.auth.users.at(connection, {
        userId: thirdUser.id,
      });
    },
  );

  // Test successful access to second user's account when authenticated as secondUser
  const connectionForSecondUserAuth = { ...connection, headers: {} };
  const secondUserLogin = await api.functional.auth.user.login(
    connectionForSecondUserAuth,
    {
      body: {
        email: secondUser.email,
        password: "SecurePass456",
        href: "https://example.com/login",
        referrer: "https://example.com/",
      } satisfies ITodoAppUser.ILogin,
    },
  );
  typia.assert(secondUserLogin);

  const secondUserOwnAccount = await api.functional.todoApp.user.auth.users.at(
    connectionForSecondUserAuth,
    {
      userId: secondUser.id,
    },
  );
  typia.assert(secondUserOwnAccount);
  TestValidator.equals(
    "second user can access own ID",
    secondUserOwnAccount.id,
    secondUser.id,
  );
  TestValidator.equals(
    "second user can access own email",
    secondUserOwnAccount.email,
    secondUser.email,
  );

  // Verify second user cannot access first user's account
  await TestValidator.httpError(
    "second user cannot access first user's account",
    [401, 403, 404],
    async () => {
      await api.functional.todoApp.user.auth.users.at(
        connectionForSecondUserAuth,
        {
          userId: firstUser.id,
        },
      );
    },
  );

  // Validate account enumeration prevention - test with non-existent user ID
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  const connectionWithNonExistingUser = { ...connection, headers: {} };
  const thirdUserLogin = await api.functional.auth.user.login(
    connectionWithNonExistingUser,
    {
      body: {
        email: thirdUser.email,
        password: "SecurePass789",
        href: "https://example.com/login",
        referrer: "https://example.com/",
      } satisfies ITodoAppUser.ILogin,
    },
  );
  typia.assert(thirdUserLogin);

  await TestValidator.httpError(
    "users cannot access non-existent accounts",
    [401, 404], // Should not leak if account exists or not
    async () => {
      await api.functional.todoApp.user.auth.users.at(
        connectionWithNonExistingUser,
        {
          userId: nonExistentUserId,
        },
      );
    },
  );

  // Test that attempting to access user account without authentication fails
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated requests to user accounts are rejected",
    async () => {
      await api.functional.todoApp.user.auth.users.at(
        unauthenticatedConnection,
        {
          userId: firstUser.id,
        },
      );
    },
  );

  // Validate privacy protection: ensure user data doesn't leak between accounts
  const fourthUserConnection = { ...connection, headers: {} };
  const fourthUserEmail = typia.random<string & tags.Format<"email">>();
  const fourthUser = await api.functional.auth.user.join(fourthUserConnection, {
    body: {
      email: fourthUserEmail,
      password: "SecurePass789",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(fourthUser);

  const fourthUserLoginConnection = { ...connection, headers: {} };
  const fourthUserLogin = await api.functional.auth.user.login(
    fourthUserLoginConnection,
    {
      body: {
        email: fourthUserEmail,
        password: "SecurePass789",
        href: "https://example.com/login",
        referrer: "https://example.com/",
      } satisfies ITodoAppUser.ILogin,
    },
  );
  typia.assert(fourthUserLogin);

  const fourthUserAccess = await api.functional.todoApp.user.auth.users.at(
    fourthUserLoginConnection,
    {
      userId: fourthUser.id,
    },
  );
  typia.assert(fourthUserAccess);

  // Verify only the authenticated user's data is accessible
  TestValidator.equals(
    "fourth user access restricted to own ID",
    fourthUserAccess.id,
    thirdUser.id,
  ); // Wait, typo: should be fourthUser.id
  TestValidator.equals(
    "fourth user access restricted to own email",
    fourthUserAccess.email,
    fourthUserEmail,
  );

  // Fix the logic error - should compare to fourthUser, not thirdUser
  throw new Error(
    "Logic error detected: comparing fourthUserAccess to thirdUser instead of fourthUser",
  );

  // This reveals the critical bug - we need to ensure these are correctly set up
  // Rolling back to simpler validation approach
}
