import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

export async function test_api_admin_password_reset_request_with_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a completely random email address that does not exist in the system
  const nonexistentEmail = typia.random<string & tags.Format<"email">>();

  // Submit password reset request with the non-existent email
  const response: IRedditLikeAdmin.IPasswordResetRequestResponse =
    await api.functional.auth.admin.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: nonexistentEmail,
        } satisfies IRedditLikeAdmin.IPasswordResetRequest,
      },
    );

  // Validate the response structure and type
  typia.assert(response);

  // Verify that the response indicates success (anti-enumeration security feature)
  TestValidator.equals("response success flag", response.success, true);

  // Verify that a generic message is returned
  TestValidator.predicate(
    "response contains message",
    typeof response.message === "string" && response.message.length > 0,
  );
}
