import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

export async function test_api_econ_pol_discussion_board_member_creation(
  connection: api.IConnection,
) {
  // Generate unique username and email
  const username = `user_${RandomGenerator.alphaNumeric(10)}`;
  const email = `${username}@example.com`;
  const password = RandomGenerator.alphaNumeric(16); // plain text password

  // Prepare request body
  const body = {
    username: username,
    password: password,
    email: email,
  } satisfies IEconPolDiscussionBoardMember.ICreate;

  // Call the create API to register the new member
  const member =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardMembers.create(
      connection,
      { body },
    );
  typia.assert(member);

  // Validate returned data
  TestValidator.equals("registered username", member.username, username);
  TestValidator.equals("registered email", member.email, email);

  // Validate timestamps are present and ISO date-time strings
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof member.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        member.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 string",
    typeof member.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        member.updated_at,
      ),
  );

  // Deleted_at should be null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    member.deleted_at === null || member.deleted_at === undefined,
  );
}
