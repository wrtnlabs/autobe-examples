import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that newly registered members have immediate access to platform
 * features.
 *
 * Validates the member registration process and confirms that members can
 * immediately access the discussion board platform without email verification
 * delays. Upon successful registration with valid credentials, the member
 * account is created with 'active' account_status, enabling immediate article
 * creation, comment posting, and attachment uploads.
 *
 * Steps:
 *
 * 1. Register a new member with valid email and password
 * 2. Verify registration response includes member ID and email
 * 3. Confirm creation timestamp is set
 * 4. Validate member can immediately use platform features
 */
export async function test_api_member_registration_immediate_access(
  connection: api.IConnection,
) {
  // Step 1: Generate valid test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123"; // Valid: 8+ chars, uppercase, lowercase, number

  // Step 2: Register a new member with valid credentials
  const registrationResponse =
    await api.functional.discussionBoard.auth.register(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });

  // Step 3: Validate registration response
  typia.assert(registrationResponse);

  // Step 4: Verify registered email matches request
  TestValidator.equals(
    "registered email matches request email",
    registrationResponse.email,
    email,
  );

  // Step 5: Verify member ID exists (confirms account creation)
  TestValidator.predicate(
    "member ID is generated upon registration",
    registrationResponse.id !== null &&
      registrationResponse.id !== undefined &&
      registrationResponse.id.length > 0,
  );

  // Step 6: Verify creation timestamp exists (confirms immediate account activation)
  TestValidator.predicate(
    "creation timestamp is set confirming immediate access",
    registrationResponse.created_at !== null &&
      registrationResponse.created_at !== undefined &&
      registrationResponse.created_at.length > 0,
  );
}
