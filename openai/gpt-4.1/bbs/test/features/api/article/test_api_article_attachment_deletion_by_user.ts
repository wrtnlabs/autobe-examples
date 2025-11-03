import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that an authenticated user can delete (soft-delete) an attachment from
 * their own article.
 *
 * 1. Register and authenticate a new discussion board user
 * 2. Create an article as that user
 * 3. Upload an attachment to the article
 * 4. Delete the attachment
 * 5. Verify deleted_at property is set on returned attachment
 * 6. Attempt to delete the same attachment again and expect rejection
 * 7. Attempt to delete a non-existent attachment and expect rejection
 */
export async function test_api_article_attachment_deletion_by_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        display_name: displayName,
        avatar_url: undefined,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);

  // 2. Create article as this user
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 8,
        }),
        attachments: undefined,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 3. Upload attachment to the article
  const attachmentInput = {
    filename: RandomGenerator.alphaNumeric(10) + ".png",
    kind: "image",
    mimetype: "image/png",
    filesize: 1024,
  } satisfies IDiscussionBoardArticleAttachment.ICreate;
  const attachment =
    await api.functional.discussionBoard.user.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 4. Delete the attachment
  const deleted =
    await api.functional.discussionBoard.user.articles.attachments.erase(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(deleted);
  // 5. Check deleted_at is set
  TestValidator.predicate(
    "attachment deleted_at is present",
    deleted.deleted_at !== null && deleted.deleted_at !== undefined,
  );

  // 6. Attempt to delete the same attachment again, expect error
  await TestValidator.error("second delete attempt should fail", async () => {
    await api.functional.discussionBoard.user.articles.attachments.erase(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
      },
    );
  });

  // 7. Attempt to delete a non-existent attachment
  await TestValidator.error(
    "deleting non-existent attachment should fail",
    async () => {
      await api.functional.discussionBoard.user.articles.attachments.erase(
        connection,
        {
          articleId: article.id,
          attachmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
