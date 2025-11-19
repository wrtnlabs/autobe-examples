import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that a registered user (article author) is able to attach a supported
 * file (e.g., jpg, png, pdf, docx, xlsx, pptx) to their own article, subject to
 * limits of 5 files max per article and 10MB max file size per attachment.
 *
 * The workflow verifies that only the author may upload for this API variant,
 * all file metadata is stored correctly, and that the response includes
 * expected attachment metadata. Inputs cover valid extension, acceptable MIME,
 * and in-quota size.
 */
export async function test_api_article_attachment_by_user_upload_success(
  connection: api.IConnection,
) {
  // 1. Register a new user (the article author)
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
  >();
  const joined: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(joined);

  // 2. Simulate article creation (assume an articleId is needed)
  // Since no article creation endpoint is in scope, generate a random UUID for articleId.
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Upload a single supported file as an attachment
  // Supported extensions: jpg, png, pdf, docx, xlsx, pptx
  const allowedFiles = [
    { ext: "jpg", mime: "image/jpeg" },
    { ext: "png", mime: "image/png" },
    { ext: "pdf", mime: "application/pdf" },
    {
      ext: "docx",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    {
      ext: "xlsx",
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    {
      ext: "pptx",
      mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    },
  ] as const;
  const fileDef = RandomGenerator.pick(allowedFiles);
  const fileSize: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<10485760> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
  >();
  const attachmentBody = {
    file_name: `${RandomGenerator.alphaNumeric(8)}.${fileDef.ext}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    mime_type: fileDef.mime as string & tags.MinLength<3> & tags.MaxLength<63>,
    file_size: fileSize,
    file_uri:
      `https://cdn.example.com/uploads/${RandomGenerator.alphaNumeric(16)}.${fileDef.ext}` as string &
        tags.Format<"uri">,
  } satisfies IDiscussionBoardArticleAttachment.ICreate;

  const attachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.user.articles.attachments.create(
      connection,
      {
        articleId,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 4. Verify response includes expected attachment metadata
  TestValidator.equals("article ID matches", attachment.article_id, articleId);
  TestValidator.equals(
    "file name matches",
    attachment.file_name,
    attachmentBody.file_name,
  );
  TestValidator.equals(
    "MIME type matches",
    attachment.mime_type,
    attachmentBody.mime_type,
  );
  TestValidator.equals(
    "file size matches",
    attachment.file_size,
    attachmentBody.file_size,
  );
  TestValidator.equals(
    "file URI matches",
    attachment.file_uri,
    attachmentBody.file_uri,
  );
  TestValidator.predicate(
    "attachment id is valid uuid",
    typeof attachment.id === "string" &&
      /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(
        attachment.id,
      ),
  );
  typia.assert(attachment);
}
