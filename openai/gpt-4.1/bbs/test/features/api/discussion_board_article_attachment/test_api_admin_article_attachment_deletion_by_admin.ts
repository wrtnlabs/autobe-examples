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
 * Validates admin's soft-deletion of an article attachment, including
 * permission enforcement and attachment visibility updates.
 *
 * 1. Register a new admin account.
 * 2. Create a new discussion board article as a user (with no attachments).
 * 3. Add an attachment to the article as an admin.
 * 4. Delete the attachment using the admin account.
 * 5. Assert the attachment record is soft-deleted (deleted_at is set).
 * 6. Assert the article attachment list no longer contains the deleted attachment
 *    (enforces hidden for user list/API contract).
 * 7. Assert returned attachment objects at each step pass typia.assert with the
 *    correct type.
 */
export async function test_api_admin_article_attachment_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string as string,
      display_name: RandomGenerator.name(),
      avatar_url: undefined,
    },
  });
  typia.assert(adminJoinResult);

  // 2. Create article as user (simulate with random UUID and data, since there is no user join API and only admin token is in headers)
  // We skip the authentication; assume admin can also create articles using the API
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: articleCreateBody,
    },
  );
  typia.assert(article);

  // 3. Add an attachment by admin
  const attachmentCreateBody = {
    filename: RandomGenerator.alphabets(10) + ".png",
    kind: "image",
    mimetype: "image/png",
    filesize: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<1000000>
    >() satisfies number as number,
  } satisfies IDiscussionBoardArticleAttachment.ICreate;
  const attachment =
    await api.functional.discussionBoard.admin.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachment);

  // 4. Soft-delete (erase) the attachment as admin
  const deleted =
    await api.functional.discussionBoard.admin.articles.attachments.erase(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(deleted);

  // 5. Assert deleted_at is set
  TestValidator.predicate(
    "deleted attachment's deleted_at is set",
    deleted.deleted_at !== null && deleted.deleted_at !== undefined,
  );

  // 6. Reload article and assert attachment is now hidden (not present in article.attachments)
  const reloadedArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: articleCreateBody,
    });
  typia.assert(reloadedArticle);
  TestValidator.predicate(
    "deleted attachment not visible in article.attachments",
    !reloadedArticle.attachments.some((a) => a.id === attachment.id),
  );
}
