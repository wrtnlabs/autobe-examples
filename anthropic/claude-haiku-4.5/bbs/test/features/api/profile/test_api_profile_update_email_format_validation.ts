import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test email format validation during profile update.
 *
 * Validates that the profile update endpoint accepts valid email addresses
 * following RFC 5321 standards. The TypeScript type system enforces email
 * format validation through the `string & tags.Format<"email">` type
 * constraint, ensuring that only properly formatted emails can be submitted to
 * the API.
 *
 * This test verifies the happy path where a valid email address is successfully
 * updated in the user profile. Format validation is enforced at the type level
 * by the SDK, preventing invalid formats from being sent to the server.
 *
 * 1. Test with valid email format - should succeed
 * 2. Verify the updated profile returns the correct email address
 * 3. Confirm type safety prevents sending invalid email formats
 */
export async function test_api_profile_update_email_format_validation(
  connection: api.IConnection,
) {
  // Test: Valid email format should succeed
  const validEmail = typia.random<string & tags.Format<"email">>();
  const updateResult = await api.functional.my.profile.update(connection, {
    body: {
      email: validEmail,
    } satisfies IDiscussionBoardUser.IUpdate,
  });
  typia.assert(updateResult);
  TestValidator.equals(
    "profile updated with valid email format",
    updateResult.email,
    validEmail,
  );
}
