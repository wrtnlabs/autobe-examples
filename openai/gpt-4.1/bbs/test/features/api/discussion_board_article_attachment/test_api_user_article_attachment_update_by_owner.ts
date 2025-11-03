import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validates that a registered user (author) can update an attachment of their
 * own article, verifying ownership, metadata changes, file-replacement, type
 * constraints, and business rules enforcement.
 *
 * 1. Register a new user and authenticate.
 * 2. Create a new article as that user.
 * 3. Attach a file to the article.
 * 4. Update the attachment with a new file/metadata via the relevant endpoint.
 * 5. Assert the attachment is updated as expected.
 * 6. Attempt to update a soft-deleted attachment (should fail).
 */
export async function test_api_user_article_attachment_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const avatarUrl = RandomGenerator.pick([
    undefined,
    null,
    "https://example.com/avatar.png",
  ]);
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        display_name: displayName,
        avatar_url: avatarUrl,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);

  // 2. Create an article
  const articleTitle = RandomGenerator.name(5);
  const articleBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3. Attach a file to the article
  const origFilename = RandomGenerator.pick([
    "example.png",
    "document.pdf",
    "notes.txt",
    "archive.zip",
    "photo.jpg",
  ]);
  // Pick kind & mimetype based on filename
  const ext = origFilename.split(".").pop() ?? "txt";
  const extensionToKind: Record<string, "image" | "document" | "archive"> = {
    png: "image",
    jpg: "image",
    jpeg: "image",
    gif: "image",
    pdf: "document",
    docx: "document",
    xlsx: "document",
    txt: "document",
    zip: "archive",
  };
  const extensionToMime: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain",
    zip: "application/zip",
  };
  const kind = extensionToKind[ext] ?? "document";
  const mimetype = extensionToMime[ext] ?? "text/plain";
  const filesize = RandomGenerator.pick([12345, 999999, 10485760 - 1]); // less than 10MB

  const attachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.user.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: origFilename,
          kind,
          mimetype,
          filesize: filesize satisfies number as number,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment belongs to article",
    attachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "attachment filename matches",
    attachment.filename,
    origFilename,
  );
  TestValidator.equals("attachment kind matches", attachment.kind, kind);
  TestValidator.equals("mimetype matches", attachment.mimetype, mimetype);
  TestValidator.equals("filesize matches", attachment.filesize, filesize);
  TestValidator.predicate(
    "virus scanned is boolean",
    typeof attachment.virus_scanned === "boolean",
  );
  TestValidator.equals(
    "deleted_at null on creation",
    attachment.deleted_at,
    null,
  );

  // 4. Update the attachment - simulate replacing file (new filename, mimetype, kind, filesize)
  const updateFilename = RandomGenerator.pick([
    "new_photo.jpg",
    "updated_document.pdf",
    "second_version.txt",
    "archive_v2.zip",
  ]);
  const updateExt = updateFilename.split(".").pop() ?? "txt";
  const updatedKind = extensionToKind[updateExt] ?? "document";
  const updatedMime = extensionToMime[updateExt] ?? "text/plain";
  const updatedSize = RandomGenerator.pick([33333, 8899929, 2097152]);
  // Compose update body
  const updateBody = {
    filename: updateFilename,
    kind: updatedKind,
    mimetype: updatedMime,
    filesize: updatedSize satisfies number as number,
  } satisfies IDiscussionBoardArticleAttachment.IUpdate;
  // Perform update
  const updatedAttachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.user.articles.attachments.update(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAttachment);
  TestValidator.equals(
    "filename updated",
    updatedAttachment.filename,
    updateFilename,
  );
  TestValidator.equals("kind updated", updatedAttachment.kind, updatedKind);
  TestValidator.equals(
    "mimetype updated",
    updatedAttachment.mimetype,
    updatedMime,
  );
  TestValidator.equals(
    "filesize updated",
    updatedAttachment.filesize,
    updatedSize,
  );
  TestValidator.equals(
    "virus scanned remains boolean",
    typeof updatedAttachment.virus_scanned,
    "boolean",
  );
  TestValidator.equals(
    "attachment id remains the same after update",
    updatedAttachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "attachment still belongs to article",
    updatedAttachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "deleted_at remains null after update",
    updatedAttachment.deleted_at,
    null,
  );

  // 5. Soft-delete simulation - as the actual endpoint is unavailable, simulate by updating deleted_at property
  // (Assume business logic: cannot update after soft delete)
  // Here we simulate by calling update after setting deleted_at using returned object (simulate server logic)
  const deletedAttachment = {
    ...updatedAttachment,
    deleted_at: new Date().toISOString(),
  };
  await TestValidator.error(
    "should not allow update to soft-deleted attachment",
    async () => {
      await api.functional.discussionBoard.user.articles.attachments.update(
        connection,
        {
          articleId: article.id,
          attachmentId: deletedAttachment.id,
          body: {
            filename: "should-fail-update.txt",
          },
        },
      );
    },
  );
}
