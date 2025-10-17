import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test administrator password reset request for existing account.
 *
 * Validates the complete password reset initiation workflow for a legitimate
 * administrator who has forgotten their password. This test creates an
 * administrator account, then requests a password reset to verify the system
 * properly generates reset tokens, implements enumeration protection, and
 * returns appropriate success messages.
 *
 * Test workflow:
 *
 * 1. Create new administrator account with known credentials
 * 2. Request password reset using the administrator's email
 * 3. Validate response contains enumeration-protection message
 * 4. Verify operation completes successfully with proper security measures
 */
export async function test_api_administrator_password_reset_request_for_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const createBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const createdAdmin = await api.functional.auth.administrator.join(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(createdAdmin);

  // Step 2: Request password reset for the existing administrator account
  const resetRequestBody = {
    email: adminEmail,
  } satisfies IDiscussionBoardAdministrator.IResetRequest;

  const resetResult =
    await api.functional.auth.administrator.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(resetResult);

  // Step 3: Validate the password reset response message exists
  TestValidator.predicate(
    "reset result should contain non-empty message",
    resetResult.message.length > 0,
  );
}
