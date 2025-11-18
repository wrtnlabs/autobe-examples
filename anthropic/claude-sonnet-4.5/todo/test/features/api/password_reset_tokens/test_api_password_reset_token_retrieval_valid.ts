import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful retrieval of a valid password reset token by its unique
 * identifier.
 *
 * This test validates the token retrieval endpoint by generating a random token
 * ID and retrieving its details. Since we cannot access the actual database or
 * email system to get real token IDs, this test validates the API's ability to
 * return properly formatted token data when a valid UUID is provided.
 *
 * Workflow:
 *
 * 1. Generate a random UUID to simulate a token ID lookup
 * 2. Retrieve the token using the GET endpoint
 * 3. Validate that the response has all required token fields properly formatted
 * 4. Verify token is in unused state (used_at is null)
 */
export async function test_api_password_reset_token_retrieval_valid(
  connection: api.IConnection,
) {
  // Step 1: Generate a token ID for retrieval
  const tokenId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Retrieve the password reset token by ID
  const retrievedToken = await api.functional.todoList.passwordResetTokens.at(
    connection,
    {
      tokenId: tokenId,
    },
  );

  // Step 3: Validate the complete token structure
  typia.assert(retrievedToken);

  // Step 4: Validate business logic - token should be unused
  TestValidator.equals(
    "token should be unused (used_at is null)",
    retrievedToken.used_at,
    null,
  );
}
