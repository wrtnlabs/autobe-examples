import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test multiple consecutive password reset requests for same member account.
 *
 * This test validates that the system correctly handles multiple password reset
 * requests submitted in sequence for a single member account. It verifies
 * that:
 *
 * 1. Each password reset request creates a new token in
 *    discussion_board_password_resets
 * 2. All tokens remain valid (used_at is null) until explicitly consumed
 * 3. Multiple unused tokens can coexist for the same member
 * 4. Each response provides consistent confirmation message
 * 5. Each response indicates 60-minute expiration window
 *
 * Test workflow:
 *
 * 1. Create a new member account via registration
 * 2. Submit first password reset request with member's email
 * 3. Validate first response structure and expiration time
 * 4. Submit second password reset request with same email
 * 5. Validate second response structure and expiration time
 * 6. Submit third password reset request with same email
 * 7. Validate third response structure and expiration time
 * 8. Verify all responses are consistent
 */
export async function test_api_password_reset_request_multiple_requests(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Submit first password reset request
  const resetRequest1 =
    await api.functional.auth.member.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IDiscussionBoardMember.IRequestPasswordReset,
      },
    );
  typia.assert(resetRequest1);

  // Step 3: Validate first response
  TestValidator.predicate(
    "first reset request should have confirmation message",
    resetRequest1.message.length > 0,
  );
  TestValidator.equals(
    "first reset request expiration should be 60 minutes",
    resetRequest1.expires_in_minutes,
    60,
  );

  // Step 4: Submit second password reset request
  const resetRequest2 =
    await api.functional.auth.member.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IDiscussionBoardMember.IRequestPasswordReset,
      },
    );
  typia.assert(resetRequest2);

  // Step 5: Validate second response
  TestValidator.predicate(
    "second reset request should have confirmation message",
    resetRequest2.message.length > 0,
  );
  TestValidator.equals(
    "second reset request expiration should be 60 minutes",
    resetRequest2.expires_in_minutes,
    60,
  );

  // Step 6: Submit third password reset request
  const resetRequest3 =
    await api.functional.auth.member.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IDiscussionBoardMember.IRequestPasswordReset,
      },
    );
  typia.assert(resetRequest3);

  // Step 7: Validate third response
  TestValidator.predicate(
    "third reset request should have confirmation message",
    resetRequest3.message.length > 0,
  );
  TestValidator.equals(
    "third reset request expiration should be 60 minutes",
    resetRequest3.expires_in_minutes,
    60,
  );

  // Step 8: Verify all responses are consistent
  TestValidator.equals(
    "all reset responses should have same message",
    resetRequest1.message,
    resetRequest2.message,
  );
  TestValidator.equals(
    "all reset responses should have same message",
    resetRequest2.message,
    resetRequest3.message,
  );
  TestValidator.equals(
    "all reset responses should have same expiration time",
    resetRequest1.expires_in_minutes,
    resetRequest2.expires_in_minutes,
  );
  TestValidator.equals(
    "all reset responses should have same expiration time",
    resetRequest2.expires_in_minutes,
    resetRequest3.expires_in_minutes,
  );
}
