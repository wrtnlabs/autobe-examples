import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEmailVerification";

/**
 * Test that each email verification creation generates a unique token.
 *
 * This test validates the cryptographic security of the token generation system
 * by creating multiple verification records and ensuring no token collisions
 * occur. The test creates 5 email verification records with different member
 * IDs and emails, then validates that all generated tokens are unique and
 * properly formatted.
 *
 * Steps:
 *
 * 1. Generate test data for 5 email verification requests
 * 2. Create verification records by calling the API
 * 3. Extract all generated tokens
 * 4. Validate token uniqueness using Set comparison
 * 5. Validate token format and presence
 */
export async function test_api_email_verification_token_uniqueness(
  connection: api.IConnection,
) {
  // Step 1: Create multiple email verification records
  const verificationCount = 5;
  const verifications: IDiscussionBoardEmailVerification[] =
    await ArrayUtil.asyncRepeat(verificationCount, async (index) => {
      const requestBody = {
        discussion_board_member_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
      } satisfies IDiscussionBoardEmailVerification.ICreate;

      const verification =
        await api.functional.discussionBoard.emailVerifications.create(
          connection,
          {
            body: requestBody,
          },
        );

      typia.assert(verification);
      return verification;
    });

  // Step 2: Extract all tokens from created verifications
  const tokens = verifications.map((v) => v.token);

  // Step 3: Validate that all tokens are present and non-empty
  TestValidator.predicate(
    "all tokens should be non-empty strings",
    tokens.every((token) => typeof token === "string" && token.length > 0),
  );

  // Step 4: Validate token uniqueness
  const uniqueTokens = new Set(tokens);
  TestValidator.equals(
    "all tokens should be unique",
    uniqueTokens.size,
    tokens.length,
  );
}
