import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful moderator account registration workflow.
 *
 * This test validates that new moderators can successfully create accounts and
 * receive authentication tokens for immediate platform access. It verifies the
 * complete registration process including account creation, credential
 * validation, and token issuance.
 *
 * Test Steps:
 *
 * 1. Prepare valid moderator registration data with unique email, password,
 *    username
 * 2. Include connection metadata (ip, href, referrer) for session tracking
 * 3. Call the moderator join endpoint with registration data
 * 4. Validate successful account creation with proper response structure
 * 5. Verify authentication tokens are issued immediately
 * 6. Confirm moderator account details match input data
 */
export async function test_api_moderator_registration_success(
  connection: api.IConnection,
) {
  // Step 1: Prepare valid moderator registration data
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = RandomGenerator.alphaNumeric(16);
  const registrationUsername = RandomGenerator.name(1);

  const registrationData = {
    email: registrationEmail,
    password: registrationPassword,
    username: registrationUsername,
    ip: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}`,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Step 2: Call the moderator join endpoint
  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate response structure and type conformity
  typia.assert(registeredModerator);

  // Step 4: Verify moderator account details match input
  TestValidator.equals(
    "registered email matches input",
    registeredModerator.email,
    registrationEmail,
  );

  TestValidator.equals(
    "registered username matches input",
    registeredModerator.username,
    registrationUsername,
  );

  // Step 5: Validate token object exists with required properties
  TestValidator.predicate(
    "access token is non-empty string",
    registeredModerator.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is non-empty string",
    registeredModerator.token.refresh.length > 0,
  );
}
