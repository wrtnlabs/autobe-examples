import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

/**
 * Test rate limiting protection for password reset requests.
 *
 * This test validates that the password reset endpoint enforces a rate limit of
 * maximum 3 requests per day per email address. The system should accept the
 * first 3 password reset requests for the same email address, but reject the
 * 4th and subsequent requests to prevent email bombing attacks.
 *
 * Test workflow:
 *
 * 1. Generate a test administrator email address
 * 2. Submit 3 password reset requests with the same email address
 * 3. Verify all 3 requests are successful (HTTP 200)
 * 4. Submit a 4th password reset request with the same email
 * 5. Verify the 4th request is rejected due to rate limiting
 * 6. Validate that the rate limiting error response is appropriate
 */
export async function test_api_administrator_password_reset_request_rate_limiting(
  connection: api.IConnection,
) {
  // Generate a test email address for the administrator
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Step 1-3: Submit 3 successful password reset requests
  const successfulResponses: ICommunityPlatformAdministrator.IPasswordResetResponse[] =
    [];

  for (let i = 0; i < 3; i++) {
    const response =
      await api.functional.communityPlatform.auth.administrator.password_reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: testEmail,
          } satisfies ICommunityPlatformAdministrator.IPasswordResetRequest,
        },
      );
    typia.assert(response);
    successfulResponses.push(response);
  }

  // Validate that all 3 requests returned successful responses
  TestValidator.predicate(
    "first 3 password reset requests should be successful",
    successfulResponses.length === 3,
  );

  // Validate that all responses contain the generic success message
  for (let i = 0; i < successfulResponses.length; i++) {
    TestValidator.predicate(
      `password reset response ${i + 1} should contain message`,
      successfulResponses[i].message !== null &&
        successfulResponses[i].message !== undefined &&
        successfulResponses[i].message.length > 0,
    );
  }

  // Step 4-5: Submit a 4th password reset request and verify it's rejected
  await TestValidator.error(
    "4th password reset request should be rejected due to rate limiting",
    async () => {
      await api.functional.communityPlatform.auth.administrator.password_reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: testEmail,
          } satisfies ICommunityPlatformAdministrator.IPasswordResetRequest,
        },
      );
    },
  );

  // Step 6: Validate additional rate limit attempts are also rejected
  await TestValidator.error(
    "5th password reset request should also be rejected due to rate limiting",
    async () => {
      await api.functional.communityPlatform.auth.administrator.password_reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: testEmail,
          } satisfies ICommunityPlatformAdministrator.IPasswordResetRequest,
        },
      );
    },
  );
}
