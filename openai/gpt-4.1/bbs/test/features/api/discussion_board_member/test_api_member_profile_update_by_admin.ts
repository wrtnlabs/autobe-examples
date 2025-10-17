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
 * Validate that an admin can update any member's profile with proper business
 * rules.
 *
 * 1. Register a unique admin account (capture credentials for authentication
 *    context).
 * 2. Register a new member account (capture credentials and identifiers).
 * 3. The member posts a topic to fully activate their presence.
 * 4. As the admin, update the member's email and username (with new, unique
 *    values).
 *
 * - Confirm updated fields and that email_verified flag resets to false on email
 *   update.
 *
 * 5. Attempt to update with a duplicate email and username (conflicting with other
 *    accounts), confirm the API rejects the update as per business validation
 *    rules.
 */
export async function test_api_member_profile_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminPassword = "Admin!Passw0rd";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword as string & tags.Format<"password">,
    },
  });
  typia.assert(admin);
  const adminId = admin.id;
  // Admin context is now in effect for the connection

  // 2. Register member1 (target for updates)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Username = RandomGenerator.name();
  const member1Password = "User1_Pass123";
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      username: member1Username,
      password: member1Password as string & tags.Format<"password">,
    },
  });
  typia.assert(member1);
  const member1Id = member1.id;

  // 3. Member1 posts a topic
  const topic1 = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        subject: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 18,
        }),
      },
    },
  );
  typia.assert(topic1);

  // 4. As admin, update member1's profile fields to new unique email and username
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newUsername = RandomGenerator.name();
  const updateProfileBody = {
    email: newEmail,
    username: newUsername,
  } satisfies IDiscussionBoardMember.IUpdate;
  const updatedMember =
    await api.functional.discussionBoard.admin.members.update(connection, {
      memberId: member1Id,
      body: updateProfileBody,
    });
  typia.assert(updatedMember);
  TestValidator.equals("member email updated", updatedMember.email, newEmail);
  TestValidator.equals("username updated", updatedMember.username, newUsername);
  TestValidator.equals(
    "email_verified reset after email update",
    updatedMember.email_verified,
    false,
  );

  // 5. Attempt to update to duplicate email/username of another member
  // Register member2 as conflicting user
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Username = RandomGenerator.name();
  const member2Password = "User2_Pass123";
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      username: member2Username,
      password: member2Password as string & tags.Format<"password">,
    },
  });
  typia.assert(member2);
  // Try duplicate email
  await TestValidator.error(
    "admin update fails on duplicate email",
    async () => {
      await api.functional.discussionBoard.admin.members.update(connection, {
        memberId: member1Id,
        body: {
          email: member2Email,
        },
      });
    },
  );
  // Try duplicate username
  await TestValidator.error(
    "admin update fails on duplicate username",
    async () => {
      await api.functional.discussionBoard.admin.members.update(connection, {
        memberId: member1Id,
        body: {
          username: member2Username,
        },
      });
    },
  );
}
