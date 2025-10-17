import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmins";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Successfully update the administrator's profile (email and username) on the
 * economic/political discussion board.
 *
 * 1. Register a new admin (join) with unique email, username, and password.
 * 2. As that admin, create a topic to confirm adminId/session setup (ensures
 *    adminId is known to the backend).
 * 3. Issue an update to the admin's own profile (change email and/or username).
 * 4. Validate that the administrator's profile fields are changed, updated_at
 *    increases, and returned object integrity and identity are correct.
 */
export async function test_api_admin_profile_update_success(
  connection: api.IConnection,
) {
  // 1. Register admin
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialUsername = RandomGenerator.name();
  const joinBody = {
    email: initialEmail,
    username: initialUsername,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdmin.ICreate;
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(adminAuth);

  // 2. Create topic as admin (ensures adminId in DB)
  const topicBody = {
    subject: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 10,
      wordMax: 20,
    }),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 15,
      sentenceMax: 30,
    }),
  } satisfies IDiscussionBoardTopic.ICreate;
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.admin.topics.create(connection, {
      body: topicBody,
    });
  typia.assert(topic);
  TestValidator.equals(
    "admin ID of author",
    topic.author_admin_id,
    adminAuth.id,
  );

  // 3. Update admin profile (change email and username)
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newUsername = RandomGenerator.name();
  const updateBody = {
    email: newEmail,
    username: newUsername,
  } satisfies IDiscussionBoardAdmins.IUpdate;
  const updated: IDiscussionBoardAdmins =
    await api.functional.discussionBoard.admin.admins.update(connection, {
      adminId: adminAuth.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Validate changes
  TestValidator.notEquals("email should change", updated.email, initialEmail);
  TestValidator.equals(
    "username should be updated",
    updated.username,
    newUsername,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updated.updated_at).getTime() >=
      new Date(updated.created_at).getTime(),
  );
  TestValidator.equals("ID remains unchanged", updated.id, adminAuth.id);
}
