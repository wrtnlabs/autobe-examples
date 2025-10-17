import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validate that an admin can view member profile details.
 *
 * 1. Register a new admin account via /auth/admin/join
 * 2. Register a new member account via /auth/member/join
 * 3. As the new member, create a topic to activate the account
 * 4. Switch to admin authentication and use
 *    /discussionBoard/admin/members/:memberId to fetch the member's profile
 *    details
 * 5. Assert that all expected fields of IDiscussionBoardMember are present and
 *    correct
 * 6. Attempt to access /discussionBoard/admin/members/:memberId as unauthenticated
 *    (empty headers) and as the member (member login)
 * 7. Confirm that both of these unauthorized attempts are denied (error is thrown)
 */
export async function test_api_member_profile_admin_detail_view(
  connection: api.IConnection,
) {
  // 1. Register a new admin and keep password for re-login
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name(2);
  const adminAuthRes = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuthRes);

  // 2. Register a new member and keep password for re-login
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name(2);
  const memberAuthRes = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberAuthRes);

  // 3. Create a topic as the member
  const memberTopic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        subject: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 6,
          wordMax: 10,
        }),
        content: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 8,
          wordMax: 16,
        }),
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(memberTopic);

  // 4. Switch to admin authentication using saved admin account
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });

  // 5. Fetch and validate member's profile via admin endpoint
  const detail = await api.functional.discussionBoard.admin.members.at(
    connection,
    {
      memberId: memberAuthRes.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals(
    "member profile id matches",
    detail.id,
    memberAuthRes.id,
  );
  TestValidator.equals(
    "member email matches",
    detail.email,
    memberAuthRes.email,
  );
  TestValidator.equals(
    "member username matches",
    detail.username,
    memberAuthRes.username,
  );

  // 6. Attempt unauthorized access (unauthenticated)
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "reject unauthenticated access to member profile",
    async () => {
      await api.functional.discussionBoard.admin.members.at(unauthConn, {
        memberId: memberAuthRes.id,
      });
    },
  );

  // 7. Attempt as member (wrong role)
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  await TestValidator.error(
    "reject member user from accessing admin endpoint",
    async () => {
      await api.functional.discussionBoard.admin.members.at(connection, {
        memberId: memberAuthRes.id,
      });
    },
  );
}
