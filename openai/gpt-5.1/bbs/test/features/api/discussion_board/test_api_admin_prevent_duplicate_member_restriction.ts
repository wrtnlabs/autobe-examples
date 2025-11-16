import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardMemberuserRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserRestriction";

export async function test_api_admin_prevent_duplicate_member_restriction(
  connection: api.IConnection,
) {
  // 1. Register a discussionBoard member user to be restricted later
  const memberJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "203.0.113.10",
    href: "https://frontend.example.com/join/member",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert(memberAuthorized);

  // Capture the member user's UUID for restriction operations
  const memberUserId = memberAuthorized.id;

  // 2. Register an administrative user (adminUser actor) and become authenticated as admin
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(20) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "198.51.100.20",
    href: "https://frontend.example.com/admin/join",
    referrer: "https://frontend.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminAuthorized);

  // 3. Create the initial restriction for this member user as the admin
  const firstRestrictionBody = {
    restriction_level: "posting_restriction",
    reason_category: "initial_test_restriction",
    started_at: new Date().toISOString(),
    ended_at: null,
  } satisfies IDiscussionBoardMemberuserRestriction.ICreate;

  const firstRestriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.adminUser.memberUsers.restriction.create(
      connection,
      {
        memberUserId,
        body: firstRestrictionBody,
      },
    );
  typia.assert(firstRestriction);

  // Validate that the created restriction is associated with the correct member
  TestValidator.equals(
    "created restriction is linked to the target member user",
    firstRestriction.memberUser.id,
    memberUserId,
  );

  // 4. Attempt to create a second restriction for the same member user
  const secondRestrictionBody = {
    restriction_level: "full_block",
    reason_category: "duplicate_creation_attempt",
    started_at: new Date(Date.now() + 60_000).toISOString(),
    ended_at: null,
  } satisfies IDiscussionBoardMemberuserRestriction.ICreate;

  await TestValidator.error(
    "creating a second restriction for the same member user must fail",
    async () => {
      await api.functional.discussionBoard.adminUser.memberUsers.restriction.create(
        connection,
        {
          memberUserId,
          body: secondRestrictionBody,
        },
      );
    },
  );
}
