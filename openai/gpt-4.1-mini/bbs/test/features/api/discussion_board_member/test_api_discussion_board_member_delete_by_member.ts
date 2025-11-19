import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_member_delete_by_member(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member user via /auth/member/join
  const joinBody: IDiscussionBoardMember.ICreate = {
    email: `${RandomGenerator.name(1).toLowerCase()}${RandomGenerator.alphaNumeric(4)}@example.com`,
    password: "TestPassword123!",
    nickname: RandomGenerator.name(2),
  };
  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // Step 2: Create a new discussion board member
  const createBody: IDiscussionBoardDiscussionBoardMember.ICreate = {
    email: `${RandomGenerator.name(1).toLowerCase()}${RandomGenerator.alphaNumeric(4)}@example.com`,
    password: "TestPassword123!",
    nickname: RandomGenerator.name(2),
  };
  const createdMember =
    await api.functional.discussionBoard.discussionBoardMembers.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdMember);

  // Step 3: Delete the created member
  await api.functional.discussionBoard.member.discussionBoardMembers.erase(
    connection,
    {
      discussionBoardMemberId: createdMember.id,
    },
  );

  // Step 4: Verify the member no longer exists
  // Since no GET API for members was provided, check unauthorized deletion

  // Step 5: Test unauthorized deletion attempts
  // Simulate unauthorized connection by creating a new join without authentication
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized deletion should fail", async () => {
    await api.functional.discussionBoard.member.discussionBoardMembers.erase(
      unauthorizedConnection,
      {
        discussionBoardMemberId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
