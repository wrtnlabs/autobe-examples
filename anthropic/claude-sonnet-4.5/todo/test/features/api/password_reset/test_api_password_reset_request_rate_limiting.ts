import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";

/**
 * Test rate limiting on password reset request endpoint.
 *
 * This test validates that the password reset request endpoint properly
 * enforces rate limiting to prevent abuse scenarios such as:
 *
 * - Denial-of-service attacks through excessive requests
 * - Email spam by triggering multiple reset emails
 * - System resource exhaustion
 *
 * Test Process:
 *
 * 1. Generate a random test email address
 * 2. Submit multiple password reset requests in rapid succession
 * 3. Validate all responses maintain proper structure
 * 4. Verify the system handles rapid requests without errors
 */
export async function test_api_password_reset_request_rate_limiting(
  connection: api.IConnection,
) {
  // Generate a random test email for rate limiting test
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Submit first password reset request
  const firstRequest =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: testEmail,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(firstRequest);

  // Submit multiple rapid requests to test rate limiting behavior
  const rapidRequests = await ArrayUtil.asyncRepeat(10, async (index) => {
    const request =
      await api.functional.auth.user.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: testEmail,
          } satisfies ITodoListPasswordReset.IRequest,
        },
      );
    typia.assert(request);
    return request;
  });

  // Submit additional request to further test rate limiting
  const additionalRequest =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: testEmail,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(additionalRequest);
}
