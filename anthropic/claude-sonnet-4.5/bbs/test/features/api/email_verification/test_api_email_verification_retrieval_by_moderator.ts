import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEmailVerification";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator email verification retrieval functionality.
 *
 * This test validates the complete workflow of creating a verification record
 * and then retrieving it with full details including token, expiration status,
 * and member information. The test ensures moderators can inspect verification
 * records for troubleshooting member registration issues.
 *
 * Workflow:
 *
 * 1. Register moderator account with authentication
 * 2. Create email verification record for a member
 * 3. Retrieve the verification record by ID as moderator
 * 4. Validate all required fields are present and match original data
 */
export async function test_api_email_verification_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account with authentication
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    username: typia.random<string & tags.MinLength<3>>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create email verification record
  const verificationData = {
    discussion_board_member_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IDiscussionBoardEmailVerification.ICreate;

  const createdVerification: IDiscussionBoardEmailVerification =
    await api.functional.discussionBoard.emailVerifications.create(connection, {
      body: verificationData,
    });
  typia.assert(createdVerification);

  // Step 3: Retrieve the verification record by ID as moderator
  const retrievedVerification: IDiscussionBoardEmailVerification =
    await api.functional.discussionBoard.moderator.emailVerifications.at(
      connection,
      {
        verificationId: createdVerification.id,
      },
    );
  typia.assert(retrievedVerification);

  // Step 4: Validate retrieved record matches created data
  TestValidator.equals(
    "verification ID matches",
    retrievedVerification.id,
    createdVerification.id,
  );

  TestValidator.equals(
    "member ID matches",
    retrievedVerification.discussion_board_member_id,
    createdVerification.discussion_board_member_id,
  );

  TestValidator.equals(
    "email matches",
    retrievedVerification.email,
    createdVerification.email,
  );

  TestValidator.equals(
    "token matches",
    retrievedVerification.token,
    createdVerification.token,
  );

  TestValidator.equals(
    "expires_at matches",
    retrievedVerification.expires_at,
    createdVerification.expires_at,
  );

  TestValidator.equals(
    "verified_at matches",
    retrievedVerification.verified_at,
    createdVerification.verified_at,
  );

  TestValidator.equals(
    "created_at matches",
    retrievedVerification.created_at,
    createdVerification.created_at,
  );
}
