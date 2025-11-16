import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate post attachment update by the post's owner.
 *
 * This scenario verifies that a user who owns a post can successfully update a
 * post's attachment metadata (uri and mimetype). The test ensures ownership
 * handling, mutable field updates, and proper association with the parent
 * post.
 *
 * 1. Register a user and authenticate (save token in api connection)
 * 2. Assume a postId is available (test assumes valid postId)
 * 3. Create an attachment for the specified post
 * 4. Update the attachment's uri and mimetype
 * 5. Validate that only allowed fields mutate, uri/mimetype updated, post_id
 *    preserved
 */
export async function test_api_post_attachment_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1. Register a user to act as post owner (authentication)
  const userJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;

  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoin });
  typia.assert(user);

  // Step 2. Simulate/assume existing postId (as post creation API not provided in DTO/API scope)
  const postId = typia.random<string & tags.Format<"uuid">>();

  // Step 3. Create a new attachment for the post
  const createBody = {
    uri: typia.random<string & tags.Format<"uri">>(),
    mimetype: RandomGenerator.pick([
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/zip",
    ] as const),
  } satisfies ICommunityPlatformPostAttachment.ICreate;
  const attachment: ICommunityPlatformPostAttachment =
    await api.functional.communityPlatform.user.posts.attachments.create(
      connection,
      {
        postId,
        body: createBody,
      },
    );
  typia.assert(attachment);

  // Step 4. Prepare new attachment metadata to update
  const updateBody = {
    uri: typia.random<string & tags.Format<"uri">>(),
    mimetype: RandomGenerator.pick([
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/zip",
    ] as const),
  } satisfies ICommunityPlatformPostAttachment.IUpdate;
  // Step 5. Update the attachment as the owner
  const updated: ICommunityPlatformPostAttachment =
    await api.functional.communityPlatform.user.posts.attachments.update(
      connection,
      {
        postId,
        attachmentId: attachment.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // Step 6. Validate that uri and mimetype are updated, post_id is unchanged, id remains, and created_at is unchanged
  TestValidator.equals(
    "id remains the same after update",
    updated.id,
    attachment.id,
  );
  TestValidator.equals("parent post_id remains", updated.post_id, postId);
  TestValidator.equals("uri updated", updated.uri, updateBody.uri);
  TestValidator.equals(
    "mimetype updated",
    updated.mimetype,
    updateBody.mimetype,
  );
  TestValidator.equals(
    "created_at unchanged on update",
    updated.created_at,
    attachment.created_at,
  );
}
