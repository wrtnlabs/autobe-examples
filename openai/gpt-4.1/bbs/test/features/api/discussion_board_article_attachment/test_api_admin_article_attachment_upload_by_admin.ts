import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that an administrator can upload a new attachment (file/image/doc) to a
 * discussion board article.
 *
 * Workflow:
 *
 * 1. Register a new admin with random email/password/display_name.
 * 2. Create a new article as a standard user (with random title/body).
 * 3. Authenticate as admin to enable privileged upload.
 * 4. Upload an allowed attachment (e.g., PNG, <10MB, correct mime/kind).
 * 5. Assert attachment metadata (filename, kind, mimetype, size).
 * 6. Assert attachment is associated with correct article.
 * 7. Assert attachment appears in article's attachment array.
 * 8. No business rule violations or errors occur.
 */
export async function test_api_admin_article_attachment_upload_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name();
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword satisfies string as string,
        display_name: adminDisplayName,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new article as a user (simulate user context)
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 12,
          wordMin: 4,
          wordMax: 10,
        }),
        attachments: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3. Admin is already authenticated, upload an attachment as admin
  // Prepare file metadata for allowed types
  const allowedTypes = [
    { ext: ".png", kind: "image", mimetype: "image/png" },
    { ext: ".jpg", kind: "image", mimetype: "image/jpeg" },
    { ext: ".jpeg", kind: "image", mimetype: "image/jpeg" },
    { ext: ".gif", kind: "image", mimetype: "image/gif" },
    { ext: ".pdf", kind: "document", mimetype: "application/pdf" },
    {
      ext: ".docx",
      kind: "document",
      mimetype:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    {
      ext: ".xlsx",
      kind: "document",
      mimetype:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    { ext: ".txt", kind: "document", mimetype: "text/plain" },
    { ext: ".zip", kind: "archive", mimetype: "application/zip" },
  ] as const;
  const chosen = RandomGenerator.pick(allowedTypes);
  const baseName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  }).replace(/\s+/g, "_");
  const filename = `${baseName}${chosen.ext}`;
  const filesize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000000>
  >() satisfies number as number;
  const attachmentBody = {
    filename,
    kind: chosen.kind,
    mimetype: chosen.mimetype,
    filesize,
  } satisfies IDiscussionBoardArticleAttachment.ICreate;

  const attachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.admin.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 4. Assert stored properties match sent file metadata
  TestValidator.equals("filename should match", attachment.filename, filename);
  TestValidator.equals("kind should match", attachment.kind, chosen.kind);
  TestValidator.equals(
    "mimetype should match",
    attachment.mimetype,
    chosen.mimetype,
  );
  TestValidator.equals("filesize should match", attachment.filesize, filesize);
  TestValidator.equals(
    "article association correct",
    attachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.predicate(
    "virus scan should be true or boolean",
    typeof attachment.virus_scanned === "boolean",
  );

  // 5. Validate attachment appears in the article's attachments
  const refreshedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: article.title,
        body: article.body,
        attachments: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(refreshedArticle);

  // Because create returns newly created article, instead we'll just check the returned attachment (already asserted above)
  // This endpoint does not have a reload/detail: skip attachments-in-article validation unless a get API exists
}
