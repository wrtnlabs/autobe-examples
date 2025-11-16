import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentAttachment";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test deletion of a comment attachment by a platform moderator.
 *
 * - Moderator account is registered and joined.
 * - A new attachment is created on a comment (as if by a regular user).
 * - Moderator deletes the attachment via the moderator API endpoint.
 * - Test confirms privilege (operation does not error) and attempts re-deletion
 *   to verify deletion state.
 */
export async function test_api_comment_attachment_deletion_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a new moderator and obtain authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "secureModeratorPW!123",
        status: "active",
        href: "https://community-platform.test/moderator-register",
        referrer: "https://community-platform.test/landing",
        business_status: null,
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Simulate an existing comment (just a random UUID in absence of comment creation API)
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create an attachment as normal user (simulate via the create endpoint; the API injects current user/session)
  const attachmentUri =
    "https://community-platform.test/static/attachment/img-" +
    RandomGenerator.alphaNumeric(8) +
    ".jpg";
  const attachment: ICommunityPlatformCommentAttachment =
    await api.functional.communityPlatform.comments.attachments.create(
      connection,
      {
        commentId,
        body: {
          uri: attachmentUri,
        } satisfies ICommunityPlatformCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Delete the attachment as moderator (using the special moderator endpoint)
  await api.functional.communityPlatform.moderator.comments.attachments.erase(
    connection,
    {
      commentId: attachment.comment_id,
      attachmentId: attachment.id,
    },
  );

  // 5. Attempt to delete again to ensure resource is gone (should yield error)
  await TestValidator.error(
    "repeated deletion by moderator should fail",
    async () => {
      await api.functional.communityPlatform.moderator.comments.attachments.erase(
        connection,
        {
          commentId: attachment.comment_id,
          attachmentId: attachment.id,
        },
      );
    },
  );
}
