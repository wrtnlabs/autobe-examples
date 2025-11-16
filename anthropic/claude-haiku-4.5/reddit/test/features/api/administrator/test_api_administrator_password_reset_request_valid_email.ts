import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

export async function test_api_administrator_password_reset_request_valid_email(
  connection: api.IConnection,
) {
  /**
   * Test Step 1: Prepare test data Generate a valid email address for the
   * administrator password reset request
   */
  const adminEmail = typia.random<string & tags.Format<"email">>();

  /**
   * Test Step 2: Request password reset with valid email Call the password
   * reset request endpoint with a valid administrator email address
   */
  const response: ICommunityPlatformAdministrator.IPasswordResetResponse =
    await api.functional.communityPlatform.auth.administrator.password_reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: adminEmail,
        } satisfies ICommunityPlatformAdministrator.IPasswordResetRequest,
      },
    );

  /**
   * Test Step 3: Validate response Verify that the response is properly
   * structured and contains a success message
   */
  typia.assert(response);

  /**
   * Test Step 4: Verify response message Confirm that the response message is a
   * non-empty string indicating password reset email was sent
   */
  TestValidator.predicate(
    "response should contain a message",
    typeof response.message === "string" && response.message.length > 0,
  );

  /**
   * Test Step 5: Verify generic success message pattern Ensure the message
   * follows the email enumeration prevention principle by returning a generic
   * message that doesn't reveal whether the email exists
   */
  TestValidator.predicate(
    "response message should be generic to prevent email enumeration",
    response.message.toLowerCase().includes("email") ||
      response.message.toLowerCase().includes("password") ||
      response.message.toLowerCase().includes("reset") ||
      response.message.toLowerCase().includes("sent"),
  );
}
