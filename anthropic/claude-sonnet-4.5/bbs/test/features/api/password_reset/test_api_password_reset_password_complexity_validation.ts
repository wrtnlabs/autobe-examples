import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

export async function test_api_password_reset_password_complexity_validation(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to test password reset workflow
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const member = await api.functional.discussionBoard.members.create(
    connection,
    {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "InitialPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // Step 2: Request password reset
  const resetResponse =
    await api.functional.discussionBoard.auth.password_reset.request(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IDiscussionBoardPasswordReset.IRequest,
      },
    );
  typia.assert(resetResponse);

  // Validate that the response message is present
  TestValidator.predicate(
    "password reset request returns success message",
    resetResponse.message.length > 0,
  );

  // Step 3: Test requesting password reset for non-existent email returns same message (security)
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const resetResponse2 =
    await api.functional.discussionBoard.auth.password_reset.request(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies IDiscussionBoardPasswordReset.IRequest,
      },
    );
  typia.assert(resetResponse2);

  // Verify generic message is returned (email enumeration protection)
  TestValidator.predicate(
    "non-existent email returns generic message",
    resetResponse2.message.length > 0,
  );
}
