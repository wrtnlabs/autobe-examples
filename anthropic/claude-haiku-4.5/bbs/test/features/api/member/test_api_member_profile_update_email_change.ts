import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_profile_update_email_change(
  connection: api.IConnection,
) {
  // 1. Register a new member with an initial email
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const password = `Pass${RandomGenerator.alphaNumeric(8)}1`; // Must meet requirements: 8+ chars, uppercase, lowercase, number

  const registered: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: initialEmail,
        password: password,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(registered);

  // Verify the authorization token is set in connection
  TestValidator.predicate(
    "authorization token should be set in connection headers",
    connection.headers?.Authorization !== undefined,
  );

  // 2. Update the member's profile with a new email address
  const newEmail = typia.random<string & tags.Format<"email">>();

  const updatedProfile: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.me._profile.update(connection, {
      body: {
        email: newEmail,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(updatedProfile);

  // 3. Validate the email change was successful
  TestValidator.equals(
    "profile email should be updated to new email",
    updatedProfile.email,
    newEmail,
  );

  // 4. Verify the member ID is preserved (immutable)
  TestValidator.equals(
    "member ID should remain unchanged after profile update",
    updatedProfile.id,
    registered.id,
  );

  // 5. Verify account status is still active
  TestValidator.equals(
    "account status should remain active",
    updatedProfile.account_status,
    "active",
  );

  // 6. Verify account is not deleted
  TestValidator.predicate(
    "account should not be deleted (deleted_at should be null or undefined)",
    updatedProfile.deleted_at === null ||
      updatedProfile.deleted_at === undefined,
  );

  // 7. Verify updated_at timestamp exists and was set
  TestValidator.predicate(
    "updated_at timestamp should be a valid ISO datetime string",
    typeof updatedProfile.updated_at === "string" &&
      updatedProfile.updated_at.length > 0,
  );

  // 8. Verify created_at timestamp exists (immutable record of creation)
  TestValidator.predicate(
    "created_at timestamp should be a valid ISO datetime string",
    typeof updatedProfile.created_at === "string" &&
      updatedProfile.created_at.length > 0,
  );
}
