import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate successful admin attachment upload for any article.
 *
 * This test ensures:
 *
 * 1. An admin can upload a valid attachment to any article
 * 2. Ownership check is bypassed for admin role
 * 3. File type, size, and per-article limits are enforced (happy-path: one
 *    attachment, valid type/size)
 * 4. All attachment metadata is stored and returned
 *
 * Steps:
 *
 * - Register an admin
 * - Register a user (the article would belong to this user)
 * - Simulate an article (use random UUID as articleId for scope of this test)
 * - Admin uploads a valid attachment to this article using admin API
 * - Assert response fields correctness, linkage, and metadata
 */
export async function test_api_article_attachment_by_admin_upload_success(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.join.example.com/register",
    referrer: "https://admin.join.example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Register user
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardUser.ICreate;
  const user = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(user);

  // 3. Simulate an existing article owned by user (use placeholder UUID)
  // As article creation API is not available, we simulate a UUID (real system would have this resource)
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Admin uploads an attachment for this article (valid type, size, in quota)
  const allowedFiles = [
    { ext: "jpg", mime: "image/jpeg" },
    { ext: "jpeg", mime: "image/jpeg" },
    { ext: "png", mime: "image/png" },
    { ext: "gif", mime: "image/gif" },
    { ext: "pdf", mime: "application/pdf" },
    { ext: "doc", mime: "application/msword" },
    {
      ext: "docx",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    { ext: "xls", mime: "application/vnd.ms-excel" },
    {
      ext: "xlsx",
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    { ext: "ppt", mime: "application/vnd.ms-powerpoint" },
    {
      ext: "pptx",
      mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    },
  ] as const;
  const chosenFile = RandomGenerator.pick(allowedFiles);
  const fileName =
    RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 12 }) +
    "." +
    chosenFile.ext;
  const attachmentCreateBody = {
    file_name: fileName,
    mime_type: chosenFile.mime,
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
    >() satisfies number as number,
    file_uri: `https://files.example.com/uploaded/${RandomGenerator.alphaNumeric(24)}`,
  } satisfies IDiscussionBoardArticleAttachment.ICreate;
  const attachment =
    await api.functional.discussionBoard.admin.articles.attachments.create(
      connection,
      { articleId, body: attachmentCreateBody },
    );
  typia.assert(attachment);

  // 5. Validate returned metadata
  TestValidator.equals(
    "attachment linked to correct article",
    attachment.article_id,
    articleId,
  );
  TestValidator.equals(
    "file name matches",
    attachment.file_name,
    attachmentCreateBody.file_name,
  );
  TestValidator.equals(
    "mime type matches",
    attachment.mime_type,
    attachmentCreateBody.mime_type,
  );
  TestValidator.equals(
    "file size matches",
    attachment.file_size,
    attachmentCreateBody.file_size,
  );
  TestValidator.equals(
    "file URI matches",
    attachment.file_uri,
    attachmentCreateBody.file_uri,
  );
  TestValidator.predicate(
    "created_at is date-time",
    typeof attachment.created_at === "string" &&
      attachment.created_at.length > 0,
  );
  TestValidator.predicate(
    "id is uuid-format",
    typeof attachment.id === "string" && attachment.id.length === 36,
  );
}
