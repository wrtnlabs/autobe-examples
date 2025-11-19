import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_member_update_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new member (auth.member.join)
  const memberEmail = `user${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword = "TestPassword123!";
  const memberNickname = RandomGenerator.name();

  const joinedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        nickname: memberNickname,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(joinedMember);

  // 2. Create a discussion board member using the registered email
  const createdMember: IDiscussionBoardDiscussionBoardMember =
    await api.functional.discussionBoard.discussionBoardMembers.create(
      connection,
      {
        body: {
          email: memberEmail,
          password: memberPassword,
          nickname: memberNickname,
        } satisfies IDiscussionBoardDiscussionBoardMember.ICreate,
      },
    );
  typia.assert(createdMember);

  // 3. Update the discussion board member's email, nickname, password
  const updatedEmail =
    `updated_${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string &
      tags.Format<"email">;
  const updatedNickname = RandomGenerator.name();
  const updatedPassword = "NewPassword456!";

  const updatedMember: IDiscussionBoardDiscussionBoardMember =
    await api.functional.discussionBoard.member.discussionBoardMembers.update(
      connection,
      {
        discussionBoardMemberId: createdMember.id,
        body: {
          email: updatedEmail,
          nickname: updatedNickname,
          password: updatedPassword,
        } satisfies IDiscussionBoardDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updatedMember);

  TestValidator.equals(
    "updated email matches",
    updatedMember.email,
    updatedEmail,
  );
  TestValidator.equals(
    "updated nickname matches",
    updatedMember.nickname,
    updatedNickname,
  );

  // 4. Unauthorized update attempt
  // Register another member to simulate an unauthorized user
  const otherEmail = `other${RandomGenerator.alphaNumeric(8)}@example.com`;
  const otherPassword = "OtherPassword123!";
  const otherNickname = RandomGenerator.name();

  const otherMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: otherEmail,
        password: otherPassword,
        nickname: otherNickname,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(otherMember);

  // Create an unauthorized connection by cloning connection and resetting headers
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Try to update the first member's info using unauthorized connection
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.discussionBoard.member.discussionBoardMembers.update(
      unauthorizedConnection,
      {
        discussionBoardMemberId: createdMember.id,
        body: {
          email: `hacker${RandomGenerator.alphaNumeric(8)}@example.com`,
          nickname: "Hacker",
        } satisfies IDiscussionBoardDiscussionBoardMember.IUpdate,
      },
    );
  });

  // 5. Invalid input scenarios for update
  // a) Duplicate email (using the other member's email)
  await TestValidator.error("duplicate email update should fail", async () => {
    await api.functional.discussionBoard.member.discussionBoardMembers.update(
      connection,
      {
        discussionBoardMemberId: createdMember.id,
        body: {
          email: otherEmail,
        } satisfies IDiscussionBoardDiscussionBoardMember.IUpdate,
      },
    );
  });

  // b) Invalid email format
  await TestValidator.error(
    "invalid email format update should fail",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardMembers.update(
        connection,
        {
          discussionBoardMemberId: createdMember.id,
          body: {
            email: "invalid-email-format",
          } satisfies IDiscussionBoardDiscussionBoardMember.IUpdate,
        },
      );
    },
  );
}
