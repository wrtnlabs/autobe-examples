import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentAttachment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Validates workflow of creating a comment attachment linked to a valid
 * comment.
 *
 * 1. Register a user and authenticate to obtain necessary credentials.
 * 2. Create a comment (with random post UUID and body).
 * 3. Attach a random URI resource to the created comment.
 * 4. Check that the attachment is correctly created (properly linked, correct URI,
 *    correct user session, etc.).
 * 5. Attempt to attach the same URI again to the same comment and expect error
 *    (duplicate prevention).
 */
export async function test_api_comment_attachment_creation_with_valid_comment(
  connection: api.IConnection,
) {
  // 1. Create and authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);

  // 2. Create a comment with random post_id and body
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentBody = RandomGenerator.paragraph({ sentences: 5 });
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id: postId,
        body: commentBody,
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Attach a URI to the created comment
  const attachmentUri = typia.random<string & tags.Format<"uri">>();
  const attachment =
    await api.functional.communityPlatform.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          uri: attachmentUri,
        } satisfies ICommunityPlatformCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment.comment_id matches comment.id",
    attachment.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "attachment.uri matches requested uri",
    attachment.uri,
    attachmentUri,
  );
  TestValidator.predicate(
    "attachment has non-empty user_session_id",
    typeof attachment.user_session_id === "string" &&
      attachment.user_session_id.length > 0,
  );
  TestValidator.predicate(
    "attachment.created_at is ISO string",
    typeof attachment.created_at === "string" &&
      !isNaN(Date.parse(attachment.created_at)),
  );

  // 4. Try attaching the same URI to the same comment (should error)
  await TestValidator.error(
    "duplicate attachment URI for same comment should fail",
    async () => {
      await api.functional.communityPlatform.comments.attachments.create(
        connection,
        {
          commentId: comment.id,
          body: {
            uri: attachmentUri,
          } satisfies ICommunityPlatformCommentAttachment.ICreate,
        },
      );
    },
  );
}
