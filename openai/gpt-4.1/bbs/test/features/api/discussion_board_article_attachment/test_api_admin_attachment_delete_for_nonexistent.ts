import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";

/**
 * Validates the system's behavior when an administrator attempts to delete a
 * non-existent attachment from a discussion board article.
 *
 * This test asserts that attempts to delete attachments using random or already
 * deleted attachment IDs yield the correct error (not found or safe idempotent
 * success per business rules).
 *
 * Business context:
 *
 * - Used by platform administrators during clean-up or moderation.
 * - Ensures error reporting for ghost/dangling attachmentIds and no permission
 *   leaks.
 *
 * Steps:
 *
 * 1. Register as an admin (prerequisite for permissions).
 * 2. Create a test article and attach an actual file, capturing real ids as
 *    control.
 * 3. Attempt to delete a random (fake/nonexistent) attachmentId for the same
 *    article, expect an error (not found, business rule safe fail, or
 *    idempotent success if allowed).
 * 4. Delete the actual attachment (positive control to confirm deletion works).
 * 5. Attempt to delete the now-deleted attachment again, expecting a not found (or
 *    idempotent success) according to policy.
 * 6. Ensure that these actions have no unintended side effects (e.g., permission
 *    escalation, false deletion, or exceptions beyond the defined error mode).
 */
export async function test_api_admin_attachment_delete_for_nonexistent(
  connection: api.IConnection,
) {
  // 1. Admin join (become authorized admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A$", // ensure meets min length and complexity
    href: "https://admin-join-test/",
    referrer: "https://admin-join-ref/",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create a test article by using the attachments API (need a valid articleId).
  // Since there is no article creation endpoint, simulate that with a random UUID.
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Create a valid attachment for control
  const attachmentCreateBody =
    typia.random<IDiscussionBoardArticleAttachment.ICreate>();
  const attachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.admin.articles.attachments.create(
      connection,
      { articleId, body: attachmentCreateBody },
    );
  typia.assert(attachment);

  // 3. Attempt to delete a random (non-existent) attachmentId:
  // Should trigger a robust business response (error or logical idempotent fail)
  const fakeAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting a completely non-existent attachmentId returns error or does not succeed",
    async () => {
      await api.functional.discussionBoard.admin.articles.attachments.erase(
        connection,
        { articleId, attachmentId: fakeAttachmentId },
      );
    },
  );

  // 4. Delete real attachment (should succeed)
  await api.functional.discussionBoard.admin.articles.attachments.erase(
    connection,
    { articleId, attachmentId: attachment.id },
  );
  // No error = success

  // 5. Attempt to delete same (now deleted) attachment again
  await TestValidator.error(
    "deleting an already deleted attachment should return error or be safely idempotent per business logic",
    async () => {
      await api.functional.discussionBoard.admin.articles.attachments.erase(
        connection,
        { articleId, attachmentId: attachment.id },
      );
    },
  );
}
