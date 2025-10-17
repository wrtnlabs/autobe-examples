import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_profile_public_visibility_guest_access(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with public profile visibility
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const memberDisplayName = RandomGenerator.name(2);

  const registrationData = {
    username: memberUsername,
    email: memberEmail,
    password: "SecureP@ssw0rd123",
    display_name: memberDisplayName,
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(authorizedMember);

  // Step 2: Create unauthenticated connection (guest user)
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // Step 3: Retrieve the member profile as an unauthenticated guest
  const publicProfile: IDiscussionBoardMember.IPublic =
    await api.functional.discussionBoard.users.at(guestConnection, {
      userId: authorizedMember.id,
    });
  typia.assert(publicProfile);

  // Step 4: Validate business logic - verify retrieved profile matches created member
  TestValidator.equals(
    "profile ID matches created member ID",
    publicProfile.id,
    authorizedMember.id,
  );

  TestValidator.equals(
    "profile username matches created username",
    publicProfile.username,
    memberUsername,
  );

  TestValidator.equals(
    "profile display_name matches created display_name",
    publicProfile.display_name,
    memberDisplayName,
  );
}
