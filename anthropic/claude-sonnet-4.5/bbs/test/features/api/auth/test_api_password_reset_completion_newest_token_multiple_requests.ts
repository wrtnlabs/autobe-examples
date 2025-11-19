import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test multiple password reset requests for the same member account.
 *
 * This test validates that the system correctly handles multiple concurrent
 * password reset requests for a single member account:
 *
 * 1. A member account can be created successfully
 * 2. Multiple password reset requests can be made for the same email address
 * 3. Each request generates a valid response with proper expiration information
 * 4. The system accepts multiple reset requests without errors
 *
 * **Test Workflow:**
 *
 * 1. Create a test member account via registration
 * 2. Request password reset 3 times for the same member email
 * 3. Verify each request succeeds and returns proper response structure
 *
 * **Note:** This test validates the request workflow. Actual token validation
 * and password reset completion would require token retrieval from email or
 * database access, which is beyond the scope of E2E API testing.
 */
export async function test_api_password_reset_completion_newest_token_multiple_requests(
  connection: api.IConnection,
) {
  // Step 1: Create a test member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "originalPass123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: originalPassword,
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Request password reset multiple times (3 times) to generate multiple tokens
  const resetRequests = await ArrayUtil.asyncRepeat(3, async (index) => {
    const resetResponse =
      await api.functional.auth.member.password.reset.requestPasswordReset(
        connection,
        {
          body: {
            email: memberEmail,
          } satisfies IDiscussionBoardMember.IRequestPasswordReset,
        },
      );
    typia.assert(resetResponse);

    // Verify each request returns proper expiration info
    TestValidator.predicate(
      "reset request should indicate 60 minute expiration",
      resetResponse.expires_in_minutes === 60,
    );

    TestValidator.predicate(
      "reset request should return confirmation message",
      typeof resetResponse.message === "string" &&
        resetResponse.message.length > 0,
    );

    return resetResponse;
  });

  // Verify we got 3 reset responses
  TestValidator.equals(
    "should have 3 password reset requests",
    resetRequests.length,
    3,
  );

  // Verify all requests succeeded with proper response structure
  TestValidator.predicate(
    "all reset requests should have valid structure",
    resetRequests.every(
      (req) => req.expires_in_minutes === 60 && req.message.length > 0,
    ),
  );
}
