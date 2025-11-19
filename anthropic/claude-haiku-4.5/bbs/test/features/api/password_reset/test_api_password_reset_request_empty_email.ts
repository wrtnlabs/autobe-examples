import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordResetRequest";

export async function test_api_password_reset_request_empty_email(
  connection: api.IConnection,
) {
  /**
   * Test that empty email in password reset request is rejected.
   *
   * The API should validate that email is a required field and reject requests
   * with empty or invalid email values. Since the email field is typed as
   * string & Format<"email">, an empty string should fail validation.
   */
  await TestValidator.error("empty email should be rejected", async () => {
    return await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: "",
        } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
      },
    );
  });
}
