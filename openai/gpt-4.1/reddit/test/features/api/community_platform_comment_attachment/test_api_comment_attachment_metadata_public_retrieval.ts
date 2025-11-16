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
 * Validates public retrieval of an attachment's metadata by commentId and
 * attachmentId.
 *
 * - 1. Register a new user (join as user).
 * - 2. User creates a comment on a (random) platform post (using a random post_id,
 *        since post creation is out of scope).
 * - 3. User adds an attachment (with a random URI) to the comment.
 * - 4. Anyone (public, no auth toggle needed) retrieves the attachment metadata/URI
 *        with valid commentId and attachmentId. Assert data and linkage.
 * - 5. Attempt retrieval with mismatched commentId/attachmentId (e.g., real
 *        commentId but invalid attachmentId, or vice versa). Expect error.
 * - 6. Attempt retrieval with both IDs non-existent. Expect error.
 */
export async function test_api_comment_attachment_metadata_public_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: password as string & tags.Format<"password">,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);

  // 2. Create a new comment (post_id must be valid, so random for test platform)
  const post_id = typia.random<string & tags.Format<"uuid">>();
  const commentBody = RandomGenerator.paragraph({ sentences: 3 });
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id,
        body: commentBody,
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Attach a resource to the comment
  const uri =
    `https://cdn.example.com/test/${RandomGenerator.alphaNumeric(12)}` as string &
      tags.Format<"uri">;
  const attachment =
    await api.functional.communityPlatform.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          uri,
        } satisfies ICommunityPlatformCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment correctly linked to comment",
    attachment.comment_id,
    comment.id,
  );
  TestValidator.equals("attachment URI matches input", attachment.uri, uri);

  // 4. Publicly retrieve attachment by comment and attachment ID
  const got = await api.functional.communityPlatform.comments.attachments.at(
    connection,
    {
      commentId: comment.id,
      attachmentId: attachment.id,
    },
  );
  typia.assert(got);
  TestValidator.equals("fetched attachment matches original", got, attachment);

  // 5. Retrieval with valid commentId and random attachmentId (should fail)
  const randomAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "mismatched real commentId but invalid attachmentId fails",
    async () => {
      await api.functional.communityPlatform.comments.attachments.at(
        connection,
        {
          commentId: comment.id,
          attachmentId: randomAttachmentId,
        },
      );
    },
  );

  // 6. Retrieval with random commentId, and real attachmentId (should fail)
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "random commentId but real attachmentId fails",
    async () => {
      await api.functional.communityPlatform.comments.attachments.at(
        connection,
        {
          commentId: randomCommentId,
          attachmentId: attachment.id,
        },
      );
    },
  );

  // 7. Retrieval with both ids random (should fail)
  await TestValidator.error(
    "random commentId and attachmentId fails",
    async () => {
      await api.functional.communityPlatform.comments.attachments.at(
        connection,
        {
          commentId: randomCommentId,
          attachmentId: randomAttachmentId,
        },
      );
    },
  );
}
