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

export async function test_api_post_attachment_public_retrieval(
  connection: api.IConnection,
) {
  /**
   * Validate public retrieval of attachment metadata for a Published post.
   *
   * Steps:
   *
   * 1. Join a user (authorized context)
   * 2. Create a post (business rule: Published on success)
   * 3. Register an attachment under the post
   * 4. Retrieve the attachment without authentication (public)
   * 5. Validate immutable metadata and visibility inheritance
   */

  // 1) Join a user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `P@ssw0rd-${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.name(1),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: `https://app.example.com/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://example.com/${RandomGenerator.alphaNumeric(6)}`,
  } satisfies ICivicBoardUser.ICreate;
  const authorized: ICivicBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Create a Published post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies ICivicBoardPost.ICreate;
  const post: ICivicBoardPost =
    await api.functional.civicBoard.user.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post is created in Published status",
    post.status,
    "Published",
  );

  // 3) Register an attachment under the post
  const imageTypes = ["image/jpeg", "image/png", "image/gif"] as const;
  const chosenType: (typeof imageTypes)[number] =
    RandomGenerator.pick(imageTypes);
  const attachmentCreateBody = {
    uri: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(24)}`,
    original_filename: `file_${RandomGenerator.alphabets(8)}.${chosenType.split("/")[1]}`,
    content_type: chosenType,
    byte_size: 204800,
    image_width: 800,
    image_height: 600,
  } satisfies ICivicBoardPostAttachment.ICreate;
  const created: ICivicBoardPostAttachment =
    await api.functional.civicBoard.user.posts.attachments.create(connection, {
      postId: post.id,
      body: attachmentCreateBody,
    });
  typia.assert(created);
  TestValidator.equals(
    "attachment belongs to the created post",
    created.civic_board_post_id,
    post.id,
  );
  TestValidator.equals(
    "attachment uploader matches the joined user",
    created.uploader.id,
    authorized.id,
  );

  // 4) Public retrieval without authentication
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const read: ICivicBoardPostAttachment =
    await api.functional.civicBoard.posts.attachments.at(publicConn, {
      postId: post.id,
      attachmentId: created.id,
    });
  typia.assert(read);

  // 5) Validations on immutable metadata and visibility
  TestValidator.equals("fetched attachment id matches", read.id, created.id);
  TestValidator.equals(
    "fetched attachment parent id matches",
    read.civic_board_post_id,
    post.id,
  );
  TestValidator.equals("uri is immutable", read.uri, created.uri);
  TestValidator.equals(
    "original filename is immutable",
    read.original_filename,
    created.original_filename,
  );
  TestValidator.equals(
    "content type is preserved",
    read.content_type,
    created.content_type,
  );
  TestValidator.equals(
    "byte size is preserved",
    read.byte_size,
    created.byte_size,
  );
  TestValidator.equals(
    "image width is preserved",
    read.image_width ?? null,
    created.image_width ?? null,
  );
  TestValidator.equals(
    "image height is preserved",
    read.image_height ?? null,
    created.image_height ?? null,
  );
  TestValidator.equals(
    "uploader id is consistent",
    read.uploader.id,
    created.uploader.id,
  );
  TestValidator.predicate(
    "active attachments must not be soft-deleted (deleted_at null or undefined)",
    read.deleted_at === null || read.deleted_at === undefined,
  );
}
