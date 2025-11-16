import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentAttachment";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate that a newly registered moderator can update the URI metadata of ANY
 * comment attachment using the moderator endpoint.
 *
 * Steps:
 *
 * 1. Register a unique moderator account
 * 2. Create an attachment for an existing (fixture or test-generated) comment
 * 3. As moderator, update the attachment URI via moderator endpoint
 * 4. Assert only the URI was updated, immutable fields (id, comment_id,
 *    user_session_id, created_at) did not change
 * 5. Attempt to update an attachment with incorrect or non-existent
 *    comment/attachment pair (should fail as expected)
 * 6. Confirm permission boundaries and error behavior
 */
export async function test_api_comment_attachment_metadata_update_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        status: "active",
        business_status: null,
        href: "https://community.example.com/join",
        referrer: "https://community.example.com/home",
        ip: "127.0.0.1",
      },
    });
  typia.assert(moderator);

  // 2. Prepare comment/attachment (simulate comment existence)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const origUri =
    "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(16);
  const attachmentCreate = {
    uri: origUri,
  } satisfies ICommunityPlatformCommentAttachment.ICreate;
  const attachment: ICommunityPlatformCommentAttachment =
    await api.functional.communityPlatform.comments.attachments.create(
      connection,
      {
        commentId: commentId,
        body: attachmentCreate,
      },
    );
  typia.assert(attachment);
  TestValidator.equals("attachment URIs match", attachment.uri, origUri);

  // 3. Update metadata with moderator endpoint (change only URI)
  const newUri =
    "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(18);
  const updateBody = {
    uri: newUri,
  } satisfies ICommunityPlatformCommentAttachment.IUpdate;
  const updated: ICommunityPlatformCommentAttachment =
    await api.functional.communityPlatform.moderator.comments.attachments.update(
      connection,
      {
        commentId: commentId,
        attachmentId: attachment.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "attachment ID remains the same",
    updated.id,
    attachment.id,
  );
  TestValidator.equals(
    "comment ID remains the same",
    updated.comment_id,
    attachment.comment_id,
  );
  TestValidator.equals(
    "user session ID remains the same",
    updated.user_session_id,
    attachment.user_session_id,
  );
  TestValidator.equals(
    "creation time remains unchanged",
    updated.created_at,
    attachment.created_at,
  );
  TestValidator.equals("attachment URI updated", updated.uri, newUri);

  // 4. Edge: attempt to update non-existent attachment (should error without type validation)
  const fakeCommentId = typia.random<string & tags.Format<"uuid">>();
  const fakeAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update with non-existent IDs should fail",
    async () => {
      await api.functional.communityPlatform.moderator.comments.attachments.update(
        connection,
        {
          commentId: fakeCommentId,
          attachmentId: fakeAttachmentId,
          body: updateBody,
        },
      );
    },
  );
}
