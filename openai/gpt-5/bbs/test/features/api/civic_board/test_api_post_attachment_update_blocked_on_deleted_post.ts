import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICivicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardPost";
import type { ICivicBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardPostAttachment";
import type { ICivicBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardUser";
import type { ICivicBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardUserSession";
import type { IECivicBoardAttachmentContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECivicBoardAttachmentContentType";
import type { IECivicBoardContentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IECivicBoardContentStatus";
import type { IECivicBoardPostStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IECivicBoardPostStatus";

/**
 * Ensure attachment update is blocked when parent post is soft-deleted.
 *
 * Steps:
 *
 * 1. User self-joins (authentication established by SDK automatically).
 * 2. User creates a civic board post.
 * 3. User uploads an attachment under that post.
 * 4. User soft-deletes the parent post.
 * 5. User attempts to update the attachment under the deleted post.
 * 6. Expect an error (denial) and validate no further side effects.
 *
 * Notes:
 *
 * - We validate relational integrity at creation time by checking the
 *   attachment's civic_board_post_id equals the created post id.
 * - No GET endpoint is provided for post-erase verification of attachment state,
 *   so we only assert the business rule denial via error on update.
 */
export async function test_api_post_attachment_update_blocked_on_deleted_post(
  connection: api.IConnection,
) {
  // 1) User self-join (authentication). Token management is auto-handled by SDK
  const joinBody = typia.random<ICivicBoardUser.ICreate>();
  const auth = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(auth);

  // 2) Create a civic board post
  const postBody = {
    title: typia.random<
      string &
        tags.MinLength<1> &
        tags.MaxLength<120> &
        tags.Pattern<"^(?=.*\\S)[\\s\\S]{1,120}$">
    >(),
    body: typia.random<
      string &
        tags.MinLength<1> &
        tags.MaxLength<20000> &
        tags.Pattern<"^(?=.*\\S)[\\s\\S]{1,20000}$">
    >(),
  } satisfies ICivicBoardPost.ICreate;
  const post = await api.functional.civicBoard.user.posts.create(connection, {
    body: postBody,
  });
  typia.assert(post);

  // 3) Upload an attachment under the created post
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
  ] as const;
  const pickedType = RandomGenerator.pick(allowedTypes);
  const imageWidth = pickedType.startsWith("image/")
    ? typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>()
    : null;
  const imageHeight = pickedType.startsWith("image/")
    ? typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>()
    : null;
  const createAttachmentBody = {
    uri: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
    original_filename: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<120>
    >(),
    content_type: pickedType,
    byte_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    image_width: imageWidth,
    image_height: imageHeight,
  } satisfies ICivicBoardPostAttachment.ICreate;
  const attachment =
    await api.functional.civicBoard.user.posts.attachments.create(connection, {
      postId: post.id,
      body: createAttachmentBody,
    });
  typia.assert(attachment);

  // Relational integrity check at creation time
  TestValidator.equals(
    "attachment belongs to the created post",
    attachment.civic_board_post_id,
    post.id,
  );

  // 4) Soft-delete the parent post
  await api.functional.civicBoard.user.posts.erase(connection, {
    postId: post.id,
  });

  // 5) Prepare an update attempt under the deleted parent
  const updateBody = {
    uri: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
    original_filename: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<120>
    >(),
  } satisfies ICivicBoardPostAttachment.IUpdate;

  // 6) Expect denial: updating attachment under a deleted post must fail
  await TestValidator.error(
    "cannot update attachment when parent post is deleted",
    async () => {
      await api.functional.civicBoard.user.posts.attachments.update(
        connection,
        {
          postId: post.id,
          attachmentId: attachment.id,
          body: updateBody,
        },
      );
    },
  );
}
