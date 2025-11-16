import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test partial profile update with only username field.
 *
 * This test validates that the member profile update endpoint correctly handles
 * partial updates where only the username field is modified. It ensures that:
 *
 * 1. A member can successfully update their username
 * 2. All other profile fields remain unchanged after the update
 * 3. The API returns the complete updated profile
 *
 * Test workflow:
 *
 * 1. Register a new member account with initial profile data
 * 2. Capture the initial profile state from registration response
 * 3. Update only the username field using PUT endpoint
 * 4. Verify the username was changed to the new value
 * 5. Verify all other fields (email, status, created_at, etc.) remain unchanged
 */
export async function test_api_member_profile_update_partial_fields(
  connection: api.IConnection,
) {
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialUsername = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12);

  const registrationBody = {
    email: initialEmail,
    password: password,
    username: initialUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: "127.0.0.1",
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(authorizedMember);

  const newUsername = RandomGenerator.name();

  const updateBody = {
    username: newUsername,
  } satisfies IDiscussionBoardMember.IUpdate;

  const updatedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.update(connection, {
      memberId: authorizedMember.id,
      body: updateBody,
    });
  typia.assert(updatedMember);

  TestValidator.equals(
    "username updated successfully",
    updatedMember.username,
    newUsername,
  );

  TestValidator.equals(
    "member ID unchanged",
    updatedMember.id,
    authorizedMember.id,
  );
  TestValidator.equals("email unchanged", updatedMember.email, initialEmail);
  TestValidator.equals(
    "status unchanged",
    updatedMember.status,
    authorizedMember.status,
  );
  TestValidator.equals(
    "email verification status unchanged",
    updatedMember.email_verified,
    authorizedMember.email_verified,
  );
  TestValidator.equals(
    "created timestamp unchanged",
    updatedMember.created_at,
    authorizedMember.created_at,
  );
}
