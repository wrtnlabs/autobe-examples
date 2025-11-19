import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";

export async function test_api_discussion_board_member_registration(
  connection: api.IConnection,
) {
  // Generate realistic test data for a new discussion board member
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12); // Strong password
  const nickname: string = RandomGenerator.name(2); // typical user nickname

  // Prepare request body
  const body = {
    email: email,
    password: password,
    nickname: nickname,
  } satisfies IDiscussionBoardDiscussionBoardMember.ICreate;

  // Perform the member registration POST request
  const member: IDiscussionBoardDiscussionBoardMember =
    await api.functional.discussionBoard.discussionBoardMembers.create(
      connection,
      { body },
    );

  // Assert response type correctness
  typia.assert(member);

  // Validate the returned member data
  TestValidator.equals("member email matches input", member.email, email);
  TestValidator.equals(
    "member nickname matches input",
    member.nickname,
    nickname,
  );
  TestValidator.predicate(
    "member id is UUID",
    typeof member.id === "string" && member.id.length > 0,
  );
  TestValidator.equals(
    "member status is 'pending' or 'active' or 'banned'",
    true,
    ["active", "banned", "pending"].includes(member.status),
  );
  TestValidator.predicate(
    "member role is a non-empty string",
    typeof member.role === "string" && member.role.length > 0,
  );

  // created_at is ISO string datetime
  TestValidator.predicate(
    "member created_at is valid ISO date-time",
    typeof member.created_at === "string" &&
      !isNaN(Date.parse(member.created_at)),
  );

  // updated_at can be undefined or valid ISO datetime string
  if (member.updated_at !== undefined) {
    TestValidator.predicate(
      "member updated_at is valid ISO date-time",
      typeof member.updated_at === "string" &&
        !isNaN(Date.parse(member.updated_at)),
    );
  }
}
