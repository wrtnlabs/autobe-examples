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
 * Validate that attempting to delete an already deleted member account by an
 * admin fails.
 *
 * Workflow:
 *
 * 1. Register an admin.
 * 2. Register a member.
 * 3. Member creates a topic (shows account is in normal state).
 * 4. Admin deletes the member account (first time, should succeed).
 * 5. Admin attempts to delete the member again (should fail/business logic error).
 */
export async function test_api_admin_deletes_member_account_already_deleted(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminPassword = "adminPW!234";

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        username: adminUsername,
        password: adminPassword,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name();
  const memberPassword = "memberPW!234";

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 3. Member creates a topic
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        subject: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 12,
        }),
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 4. Switch to admin session (admin join call auto-sets admin token)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });

  // 5. Admin deletes the member (should succeed, no error)
  await api.functional.discussionBoard.admin.members.erase(connection, {
    memberId: member.id,
  });

  // 6. Admin attempts to delete the same member again (should raise business logic error)
  await TestValidator.error(
    "Deleting already deleted member should fail",
    async () => {
      await api.functional.discussionBoard.admin.members.erase(connection, {
        memberId: member.id,
      });
    },
  );
}
