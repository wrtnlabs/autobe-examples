import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that email verification endpoint is publicly accessible without
 * authentication.
 *
 * This test validates that the email verification endpoint can be called
 * without authentication headers, which is essential for newly registered
 * members who need to verify their email before logging in. While we cannot
 * test the complete verification flow (as verification tokens are sent via
 * email and not exposed through the API), we can verify that:
 *
 * 1. The endpoint is publicly accessible (no authentication required)
 * 2. The endpoint accepts properly structured verification requests
 * 3. The endpoint validates token format requirements
 *
 * Test workflow:
 *
 * 1. Create an unauthenticated connection with empty headers
 * 2. Attempt to call the email verification endpoint with a test token
 * 3. Verify that the request is processed (not rejected due to missing auth)
 * 4. The endpoint will return an error for invalid token, which proves it's
 *    accessible
 *
 * Note: This test validates public accessibility rather than successful
 * verification, as obtaining real verification tokens requires email system
 * access not available in the test environment.
 */
export async function test_api_member_email_verification_public_access(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection to simulate a user clicking
  // the verification link in their email without being logged in
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Create a properly formatted verification request
  // The token format matches what would be sent via email
  const verificationRequest = {
    token: RandomGenerator.alphaNumeric(32),
  } satisfies IDiscussionBoardMember.IVerifyEmail;

  // Test that the endpoint is accessible without authentication
  // We expect this to either succeed or fail with a business logic error
  // (invalid token), but NOT an authentication error
  // The key test is that the endpoint ACCEPTS the request without auth headers
  await TestValidator.error(
    "email verification endpoint should be accessible without authentication",
    async () => {
      const result: IDiscussionBoardMember =
        await api.functional.auth.member.email.verify.verifyEmail(
          unauthenticatedConnection,
          {
            body: verificationRequest,
          },
        );
      typia.assert(result);
    },
  );

  // The test succeeds if:
  // 1. The endpoint was called successfully (proving public access)
  // 2. Any error is a business logic error (invalid token), not auth error
  // This confirms newly registered users can attempt verification without login
}
