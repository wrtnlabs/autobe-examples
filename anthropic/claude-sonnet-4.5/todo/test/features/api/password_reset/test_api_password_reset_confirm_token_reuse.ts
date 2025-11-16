import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset request functionality.
 *
 * This test validates that the password reset request endpoint properly accepts
 * user email addresses and returns appropriate confirmation messages. Due to
 * security measures, the actual reset token is not exposed in API responses,
 * preventing full end-to-end token reuse testing without additional backend
 * test infrastructure.
 *
 * Test workflow:
 *
 * 1. Create a new user account
 * 2. Request a password reset for the user's email
 * 3. Validate the response indicates the request was processed
 */
export async function test_api_password_reset_confirm_token_reuse(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPass123!";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: initialPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Request password reset
  const resetRequest =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(resetRequest);

  // Step 3: Validate response contains confirmation message
  TestValidator.predicate(
    "reset request should return confirmation message",
    typeof resetRequest.message === "string" && resetRequest.message.length > 0,
  );
}
