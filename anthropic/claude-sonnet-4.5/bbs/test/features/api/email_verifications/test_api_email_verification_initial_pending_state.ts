import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEmailVerification";

/**
 * Test that newly created email verification records start in pending state.
 *
 * This test validates the initial state of email verification records to ensure
 * they are created in a pending state with verified_at as null, indicating that
 * verification is incomplete and awaiting member action.
 *
 * Test workflow:
 *
 * 1. Generate random valid member ID and email address
 * 2. Create a new email verification record via API
 * 3. Validate the response structure and all fields
 * 4. Assert that verified_at is explicitly null (pending state)
 * 5. Verify input data matches response data
 */
export async function test_api_email_verification_initial_pending_state(
  connection: api.IConnection,
) {
  // Generate random test data for email verification creation
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();

  // Create email verification record
  const verification: IDiscussionBoardEmailVerification =
    await api.functional.discussionBoard.emailVerifications.create(connection, {
      body: {
        discussion_board_member_id: memberId,
        email: email,
      } satisfies IDiscussionBoardEmailVerification.ICreate,
    });

  // Validate response structure - this validates ALL type aspects perfectly
  typia.assert(verification);

  // Validate input data matches response
  TestValidator.equals(
    "member ID matches input",
    verification.discussion_board_member_id,
    memberId,
  );

  TestValidator.equals("email matches input", verification.email, email);

  // CRITICAL: Validate verified_at is null (pending state)
  TestValidator.equals(
    "verified_at should be null for pending verification",
    verification.verified_at,
    null,
  );
}
