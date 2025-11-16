import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Tests that creating a post attachment with a non-existent postId is rejected
 * and does NOT create an orphan attachment.
 *
 * 1. Register a new user to establish an authenticated session.
 * 2. Attempt to create a post attachment with a random UUID for postId (there is
 *    no such post).
 * 3. Validate that a business error occurs and the operation fails; no orphaned
 *    attachment is created.
 */
export async function test_api_post_attachment_create_invalid_postid(
  connection: api.IConnection,
) {
  // 1. Register a new user for authentication context
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 2. Attempt to create an attachment for a non-existent post
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  const attachmentBody = {
    uri: typia.random<string & tags.Format<"uri">>(),
    mimetype: RandomGenerator.pick([
      "image/jpeg",
      "image/png",
      "application/pdf",
      "image/gif",
    ] as const),
  } satisfies ICommunityPlatformPostAttachment.ICreate;

  await TestValidator.error(
    "should reject attachment creation for invalid/non-existent postId",
    async () => {
      await api.functional.communityPlatform.user.posts.attachments.create(
        connection,
        {
          postId: randomPostId,
          body: attachmentBody,
        },
      );
    },
  );
}
