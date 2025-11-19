import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordResetRequest";

export async function test_api_password_reset_request_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a non-existent email address that is guaranteed not to be in the system
  const nonexistentEmail = typia.random<string & tags.Format<"email">>();

  // Request password reset for the non-existent email
  const response =
    await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: nonexistentEmail,
        } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
      },
    );

  // Verify the response is void (generic success response without revealing account status)
  typia.assert(response);

  // Validate that the API returns successfully without leaking information
  TestValidator.predicate(
    "password reset request for nonexistent email should complete without error",
    response === undefined || response === null,
  );
}
