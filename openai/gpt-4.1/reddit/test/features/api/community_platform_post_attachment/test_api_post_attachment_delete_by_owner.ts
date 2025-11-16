import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates that a post owner can delete an existing attachment from their post
 * using the authorized API.
 *
 * Steps:
 *
 * 1. Register a new user (the post owner)
 * 2. Use a fake post id (since creating a post is out of scope for the available
 *    APIs)
 * 3. Create an attachment for the post via the attachment creation API
 * 4. Delete the attachment using the owner account
 * 5. If attempted again, deletion on a non-existing attachment should throw an
 *    error (validation by error assertion)
 *
 * This test assumes a valid post id can be generated since post creation is not
 * available in the APIs. No audit verification is possible directly in this
 * test.
 */
export async function test_api_post_attachment_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "abcDEF12!",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 2. Use a random postId (cannot create a post in current API set)
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create an attachment for the post
  const attachment: ICommunityPlatformPostAttachment =
    await api.functional.communityPlatform.user.posts.attachments.create(
      connection,
      {
        postId,
        body: {
          uri: typia.random<string & tags.Format<"uri">>(),
          mimetype: RandomGenerator.pick([
            "image/png",
            "image/jpeg",
            "application/pdf",
          ] as const),
        } satisfies ICommunityPlatformPostAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment belongs to the correct post",
    attachment.post_id,
    postId,
  );

  // 4. Delete the attachment
  await api.functional.communityPlatform.user.posts.attachments.erase(
    connection,
    {
      postId,
      attachmentId: attachment.id,
    },
  );

  // 5. Attempt to delete again should error (since it's already gone)
  await TestValidator.error(
    "deleting a non-existent attachment throws error",
    async () => {
      await api.functional.communityPlatform.user.posts.attachments.erase(
        connection,
        {
          postId,
          attachmentId: attachment.id,
        },
      );
    },
  );
}
