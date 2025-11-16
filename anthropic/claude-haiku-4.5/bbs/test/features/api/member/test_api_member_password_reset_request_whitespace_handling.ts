import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_password_reset_request_whitespace_handling(
  connection: api.IConnection,
) {
  // Use a realistic, short email address to avoid length constraint issues when adding whitespace
  const baseEmail = "testuser@example.com";

  // Test Case 1: Email with leading whitespace
  const responseWithLeadingSpace: IDiscussionBoardMember.IPasswordResetRequestResponse =
    await api.functional.discussionBoard.auth.member.password_reset_request.requestPasswordReset(
      connection,
      {
        body: {
          email: ` ${baseEmail}`,
        } satisfies IDiscussionBoardMember.IPasswordResetRequest,
      },
    );
  typia.assert(responseWithLeadingSpace);
  TestValidator.predicate(
    "leading whitespace request accepted",
    responseWithLeadingSpace.message !== undefined,
  );

  // Test Case 2: Email with trailing whitespace
  const responseWithTrailingSpace: IDiscussionBoardMember.IPasswordResetRequestResponse =
    await api.functional.discussionBoard.auth.member.password_reset_request.requestPasswordReset(
      connection,
      {
        body: {
          email: `${baseEmail} `,
        } satisfies IDiscussionBoardMember.IPasswordResetRequest,
      },
    );
  typia.assert(responseWithTrailingSpace);
  TestValidator.predicate(
    "trailing whitespace request accepted",
    responseWithTrailingSpace.message !== undefined,
  );

  // Test Case 3: Email with both leading and trailing whitespace
  const responseWithBothSpaces: IDiscussionBoardMember.IPasswordResetRequestResponse =
    await api.functional.discussionBoard.auth.member.password_reset_request.requestPasswordReset(
      connection,
      {
        body: {
          email: `  ${baseEmail}  `,
        } satisfies IDiscussionBoardMember.IPasswordResetRequest,
      },
    );
  typia.assert(responseWithBothSpaces);
  TestValidator.predicate(
    "leading and trailing whitespace request accepted",
    responseWithBothSpaces.message !== undefined,
  );

  // Test Case 4: Email without whitespace (control/baseline case)
  const responseClean: IDiscussionBoardMember.IPasswordResetRequestResponse =
    await api.functional.discussionBoard.auth.member.password_reset_request.requestPasswordReset(
      connection,
      {
        body: {
          email: baseEmail,
        } satisfies IDiscussionBoardMember.IPasswordResetRequest,
      },
    );
  typia.assert(responseClean);
  TestValidator.predicate(
    "clean email without whitespace request accepted",
    responseClean.message !== undefined,
  );
}
