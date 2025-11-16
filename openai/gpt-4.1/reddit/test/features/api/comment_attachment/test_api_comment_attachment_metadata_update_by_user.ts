import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentAttachment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that an authenticated user can update the metadata (such as URI) of
 * a specific attachment on their own comment.
 *
 * Steps:
 *
 * 1. Register as a new user
 * 2. Prepare a test fixture for a comment (emulating test setup, as comment
 *    creation endpoint is out-of-scope)
 * 3. Attach an initial file/URI to the comment using the attachments API
 * 4. Attempt to update the attachment's URI with a new value - validate the update
 *    is successful, only allowed fields are changed, and response is correct
 * 5. Attempt to update to a URI already in use by another attachment for the same
 *    comment and validate a business error
 *
 * Ownership, URI uniqueness, and immutability of other properties must be
 * enforced by the API under test.
 */
export async function test_api_comment_attachment_metadata_update_by_user(
  connection: api.IConnection,
) {
  // Step 1: Register as a new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = typia.random<string & tags.Format<"password">>();
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // Step 2: Prepare a fixed commentId, as creation endpoint is out of test scope
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Create an initial attachment
  const initialUri: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const attachment: ICommunityPlatformCommentAttachment =
    await api.functional.communityPlatform.comments.attachments.create(
      connection,
      {
        commentId,
        body: {
          uri: initialUri,
        } satisfies ICommunityPlatformCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  TestValidator.equals(
    "attachment initial values",
    attachment.comment_id,
    commentId,
  );
  TestValidator.equals("attachment initial uri", attachment.uri, initialUri);

  // Step 4: Update the attachment's URI with a new, unique URI
  const updateUri: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const updated: ICommunityPlatformCommentAttachment =
    await api.functional.communityPlatform.user.comments.attachments.update(
      connection,
      {
        commentId,
        attachmentId: attachment.id,
        body: {
          uri: updateUri,
        } satisfies ICommunityPlatformCommentAttachment.IUpdate,
      },
    );
  typia.assert(updated);

  TestValidator.equals(
    "attachment id unchanged on update",
    updated.id,
    attachment.id,
  );
  TestValidator.equals(
    "attachment comment id unchanged on update",
    updated.comment_id,
    attachment.comment_id,
  );
  TestValidator.equals("attachment uri updated", updated.uri, updateUri);
  TestValidator.predicate(
    "user_session_id must be unchanged after update",
    updated.user_session_id === attachment.user_session_id,
  );
  TestValidator.predicate(
    "created_at must be unchanged after update",
    updated.created_at === attachment.created_at,
  );

  // Step 5: Attempt to update to a URI already in use by another attachment
  // First create another attachment with a unique URI
  const otherUri: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const otherAttachment: ICommunityPlatformCommentAttachment =
    await api.functional.communityPlatform.comments.attachments.create(
      connection,
      {
        commentId,
        body: {
          uri: otherUri,
        } satisfies ICommunityPlatformCommentAttachment.ICreate,
      },
    );
  typia.assert(otherAttachment);

  // Now attempt to update the original attachment to use the already-used URI
  await TestValidator.error(
    "update fails when URI is already in use for the same comment",
    async () => {
      await api.functional.communityPlatform.user.comments.attachments.update(
        connection,
        {
          commentId,
          attachmentId: attachment.id,
          body: {
            uri: otherUri,
          } satisfies ICommunityPlatformCommentAttachment.IUpdate,
        },
      );
    },
  );
}
