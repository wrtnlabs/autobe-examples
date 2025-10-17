import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";

/**
 * Test that account deletion endpoint properly enforces authorization
 * requirements.
 *
 * Verifies that only authenticated users can initiate account deletion, and
 * that unauthenticated requests are rejected with HTTP 401 Unauthorized. The
 * test ensures the system validates user identity before processing deletion
 * requests.
 *
 * Workflow:
 *
 * 1. Create an authenticated user account for testing
 * 2. Attempt account deletion with valid authentication (should succeed)
 * 3. Verify deletion response contains proper deletion confirmation
 * 4. Create another authenticated user
 * 5. Attempt account deletion without authentication (should fail with 401)
 * 6. Verify unauthenticated requests are properly rejected with correct HTTP
 *    status
 */
export async function test_api_account_deletion_authorization_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create first authenticated user for successful deletion test
  const userEmail1 = typia.random<string & tags.Format<"email">>();
  const userPassword1 = "SecurePass123!";

  const authenticatedUser1: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email: userEmail1,
        password: userPassword1,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });
  typia.assert(authenticatedUser1);
  TestValidator.equals(
    "authenticated user created",
    typeof authenticatedUser1.id,
    "string",
  );

  // Step 2: Delete authenticated user account with valid credentials
  const deleteResponse: ITodoAppAuthenticatedUser.IDeleteResponse =
    await api.functional.todoApp.authenticatedUser.auth.delete_account.deleteAccount(
      connection,
      {
        body: {
          email: userEmail1,
          password: userPassword1,
        } satisfies ITodoAppAuthenticatedUser.IDeleteRequest,
      },
    );
  typia.assert(deleteResponse);

  // Step 3: Verify deletion response contains proper confirmation
  TestValidator.predicate(
    "deletion message is non-empty",
    deleteResponse.message.length > 0,
  );
  TestValidator.predicate(
    "deleted timestamp exists",
    typeof deleteResponse.deletedAt === "string",
  );
  if (deleteResponse.recoveryDeadline !== undefined) {
    TestValidator.predicate(
      "recovery deadline exists",
      typeof deleteResponse.recoveryDeadline === "string",
    );
  }

  // Step 4: Create second authenticated user for unauthenticated deletion test
  const userEmail2 = typia.random<string & tags.Format<"email">>();
  const userPassword2 = "AnotherSecure456!";

  const authenticatedUser2: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email: userEmail2,
        password: userPassword2,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });
  typia.assert(authenticatedUser2);

  // Step 5 & 6: Attempt account deletion without authentication and verify 401 response
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "unauthenticated account deletion should fail with 401 unauthorized",
    401,
    async () => {
      await api.functional.todoApp.authenticatedUser.auth.delete_account.deleteAccount(
        unauthenticatedConnection,
        {
          body: {
            email: userEmail2,
            password: userPassword2,
          } satisfies ITodoAppAuthenticatedUser.IDeleteRequest,
        },
      );
    },
  );
}
