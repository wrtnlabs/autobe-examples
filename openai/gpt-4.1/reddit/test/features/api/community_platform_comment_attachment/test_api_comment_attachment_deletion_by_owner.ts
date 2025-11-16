import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentAttachment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates that a platform user (the original uploader) can delete their own
 * attachment from a comment, and that others cannot delete it.
 *
 * 1. Register user1 (the uploader)
 * 2. Mock an existing commentId (random UUID)
 * 3. As user1, create an attachment for the comment
 * 4. Delete the attachment as user1 (should succeed)
 * 5. Try deleting again as user1 (should fail)
 * 6. Register user2 (another user)
 * 7. As user2, try deleting the original attachment (should fail - permission
 *    denied)
 */
export async function test_api_comment_attachment_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register user1 (uploader)
  const userEmail1 = typia.random<string & tags.Format<"email">>();
  const user1: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail1,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user1);

  // 2. Mock existing commentId (random UUID)
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. As user1, create attachment for the comment
  const createBody = {
    uri: `https://files.example.com/test-${RandomGenerator.alphaNumeric(10)}.jpg`,
  } satisfies ICommunityPlatformCommentAttachment.ICreate;
  const attachment: ICommunityPlatformCommentAttachment =
    await api.functional.communityPlatform.comments.attachments.create(
      connection,
      {
        commentId,
        body: createBody,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment comment id matches",
    attachment.comment_id,
    commentId,
  );
  TestValidator.equals(
    "attachment uri matches",
    attachment.uri,
    createBody.uri,
  );

  // 4. Delete the attachment as user1 (should succeed)
  await api.functional.communityPlatform.user.comments.attachments.erase(
    connection,
    {
      commentId,
      attachmentId: attachment.id,
    },
  );

  // 5. Try deleting again as user1 (should fail)
  await TestValidator.error("repeat deletion should fail", async () => {
    await api.functional.communityPlatform.user.comments.attachments.erase(
      connection,
      {
        commentId,
        attachmentId: attachment.id,
      },
    );
  });

  // 6. Register user2
  const userEmail2 = typia.random<string & tags.Format<"email">>();
  const user2: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail2,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user2);

  // 7. As user2, try deleting user1's already deleted attachment (should fail, permission)
  await TestValidator.error(
    "non-uploader cannot delete attachment",
    async () => {
      await api.functional.communityPlatform.user.comments.attachments.erase(
        connection,
        {
          commentId,
          attachmentId: attachment.id,
        },
      );
    },
  );
}
