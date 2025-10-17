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
 * Validate admin-triggered member account deletion.
 *
 * Steps:
 *
 * 1. Create unique admin credentials and register admin
 * 2. Create unique member credentials and register member
 * 3. Member creates a topic for content existence
 * 4. Switch to admin (reset auth context)
 * 5. Admin deletes the member
 * 6. Verify member cannot login anymore
 * 7. Confirm that member's topic remains accessible
 */
export async function test_api_admin_deletes_member_account(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        username: adminUsername,
        password: adminPassword,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(memberAuth);

  // 3. Member posts a topic
  const topicSubject = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 8,
    wordMax: 16,
  });
  const topicContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 12,
    sentenceMax: 30,
    wordMin: 3,
    wordMax: 12,
  });
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        subject: topicSubject,
        content: topicContent,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);
  TestValidator.equals(
    "memberId is author_member_id",
    topic.author_member_id,
    memberAuth.id,
  );
  // 4. Switch to admin: re-init connection with admin's token
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  // 5. Admin deletes the member
  await api.functional.discussionBoard.admin.members.erase(connection, {
    memberId: memberAuth.id,
  });
  // 6. Verify member cannot login anymore (expect error)
  await TestValidator.error("deleted member cannot re-login", async () => {
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  });

  // 7. Old topic is still visible
  const readBack: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        subject: topicSubject,
        content: topicContent,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(readBack);
  TestValidator.equals(
    "topic is present after member deletion",
    readBack.subject,
    topicSubject,
  );
}
