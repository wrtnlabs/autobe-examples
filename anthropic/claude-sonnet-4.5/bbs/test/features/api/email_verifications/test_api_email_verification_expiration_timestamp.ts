import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEmailVerification";

/**
 * Test that email verification records are created with correct 24-hour
 * expiration timestamps.
 *
 * This test validates the automatic expiration timestamp calculation for email
 * verification tokens. The business requirement is that all verification tokens
 * must expire exactly 24 hours after creation.
 *
 * Test workflow:
 *
 * 1. Generate test member ID and email address
 * 2. Create email verification record via API
 * 3. Validate response structure and timestamp formats
 * 4. Calculate time difference between created_at and expires_at
 * 5. Verify the expiration window is exactly 24 hours (86400000 milliseconds)
 * 6. Confirm expires_at was automatically calculated (not in request body)
 */
export async function test_api_email_verification_expiration_timestamp(
  connection: api.IConnection,
) {
  // Generate test data for email verification request
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();

  // Create email verification record
  const verification =
    await api.functional.discussionBoard.emailVerifications.create(connection, {
      body: {
        discussion_board_member_id: memberId,
        email: email,
      } satisfies IDiscussionBoardEmailVerification.ICreate,
    });

  // Validate response structure
  typia.assert(verification);

  // Parse timestamps as Date objects for calculation
  const createdAt = new Date(verification.created_at);
  const expiresAt = new Date(verification.expires_at);

  // Calculate time difference in milliseconds
  const timeDifference = expiresAt.getTime() - createdAt.getTime();

  // 24 hours in milliseconds
  const twentyFourHours = 24 * 60 * 60 * 1000;

  // Verify that expires_at is exactly 24 hours after created_at
  TestValidator.equals(
    "expiration timestamp is exactly 24 hours after creation",
    timeDifference,
    twentyFourHours,
  );

  // Verify expires_at is in the future relative to created_at
  TestValidator.predicate(
    "expires_at timestamp is after created_at timestamp",
    expiresAt.getTime() > createdAt.getTime(),
  );

  // Verify verified_at is initially null (not verified yet)
  TestValidator.equals(
    "verified_at is null for newly created verification",
    verification.verified_at,
    null,
  );
}
