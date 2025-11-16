import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardMemberuserRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserRestriction";

export async function test_api_admin_member_user_restriction_update_for_nonexistent_record(
  connection: api.IConnection,
) {
  // 1. Join as an admin user so that subsequent adminUser endpoints are authorized
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a random memberUserId that should not correspond to an existing restriction
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Build a valid update payload for the restriction
  const updateBody = {
    restriction_level: "full_block",
    reason_category: "test_nonexistent_update",
    started_at: new Date().toISOString(),
    ended_at: null,
  } satisfies IDiscussionBoardMemberuserRestriction.IUpdate;

  // 4. Attempt to update restriction for a member user that has no existing restriction
  //    Expect the operation to fail with an error (e.g., not-found style),
  //    so wrap it with TestValidator.error.
  await TestValidator.error(
    "update non-existent member user restriction should fail",
    async () => {
      await api.functional.discussionBoard.adminUser.memberUsers.restriction.update(
        connection,
        {
          memberUserId,
          body: updateBody,
        },
      );
    },
  );
}
