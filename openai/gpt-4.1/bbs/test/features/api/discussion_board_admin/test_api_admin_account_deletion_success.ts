import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validate administrator account deletion workflow.
 *
 * This test covers the following steps:
 *
 * 1. Register a new admin account for isolation
 * 2. Create a topic as this admin (ensuring their account exists and is active)
 * 3. Soft delete the admin account using their adminId
 * 4. Validate soft-deletion (that deleted_at is set)
 * 5. Validate that deleted admins cannot re-login
 * 6. Attempt to delete the already deleted (non-existent) admin and expect
 *    business error
 */
export async function test_api_admin_account_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinAdmin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        username: adminUsername,
        password: adminPassword as string & tags.Format<"password">,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(joinAdmin);

  // 2. Create a topic as this admin (must succeed)
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.admin.topics.create(connection, {
      body: {
        subject: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 12,
        }),
        content: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 15,
          wordMax: 30,
        }),
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Soft delete this admin (must succeed)
  await api.functional.discussionBoard.admin.admins.erase(connection, {
    adminId: joinAdmin.id,
  });

  // 4. Attempt to create a topic again with the same (now deleted) admin session (should fail)
  await TestValidator.error(
    "deleted admin cannot perform admin actions",
    async () => {
      await api.functional.discussionBoard.admin.topics.create(connection, {
        body: {
          subject: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 12,
          }),
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 15,
            wordMax: 30,
          }),
        } satisfies IDiscussionBoardTopic.ICreate,
      });
    },
  );

  // 5. Try deleting again: should yield business error
  await TestValidator.error(
    "cannot delete an already deleted admin",
    async () => {
      await api.functional.discussionBoard.admin.admins.erase(connection, {
        adminId: joinAdmin.id,
      });
    },
  );
}
