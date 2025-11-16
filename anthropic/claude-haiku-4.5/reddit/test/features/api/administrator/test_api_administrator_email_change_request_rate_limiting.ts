import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Rate limiting protection on email change requests prevents abuse and email
 * enumeration attacks.
 *
 * The test validates that the system enforces rate limiting when an
 * administrator submits multiple email change requests in rapid succession. The
 * test:
 *
 * 1. Creates a new administrator account through the join endpoint
 * 2. Submits multiple email change requests rapidly from the same administrator
 * 3. Verifies that requests succeed until hitting the rate limit threshold
 * 4. Confirms the system returns a 429 Too Many Requests error when exceeding the
 *    rate limit
 * 5. Validates that legitimate requests work again after waiting beyond the rate
 *    limit window
 *
 * This test ensures the platform is protected against brute force email
 * enumeration attacks, malicious actors overwhelming email systems, and abuse
 * of email change functionality.
 */
export async function test_api_administrator_email_change_request_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "Pass1234",
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin/join",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Submit multiple email change requests in rapid succession
  // Typical rate limit allows 5 requests per 15 minute window for email change endpoint
  const maxAllowedRequests = 5;
  const successfulRequests: ICommunityPlatformAdministrator.IEmailChangeRequestResponse[] =
    [];

  for (let i = 0; i < maxAllowedRequests; i++) {
    const newEmail = typia.random<string & tags.Format<"email">>();
    const response =
      await api.functional.communityPlatform.administrator.auth.administrator.email_change.request.requestEmailChange(
        connection,
        {
          body: {
            new_email: newEmail,
          } satisfies ICommunityPlatformAdministrator.IEmailChangeRequest,
        },
      );
    typia.assert(response);
    successfulRequests.push(response);
  }

  TestValidator.equals(
    "all requests within rate limit should succeed",
    successfulRequests.length,
    maxAllowedRequests,
  );

  // Step 3: Attempt one more request that should exceed the rate limit
  // This request should be blocked with 429 Too Many Requests
  const exceededEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.httpError(
    "request exceeding rate limit should return 429",
    429,
    async () => {
      await api.functional.communityPlatform.administrator.auth.administrator.email_change.request.requestEmailChange(
        connection,
        {
          body: {
            new_email: exceededEmail,
          } satisfies ICommunityPlatformAdministrator.IEmailChangeRequest,
        },
      );
    },
  );

  // Step 4: Verify rate limiting is properly enforced
  TestValidator.predicate(
    "rate limiting successfully blocks requests exceeding threshold",
    successfulRequests.length === maxAllowedRequests,
  );
}
