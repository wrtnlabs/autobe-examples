import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleAttachment";

/**
 * Test that a registered user (as article author) can list all non-deleted
 * attachments for their own article.
 *
 * This test executes the following flow:
 *
 * 1. Register as a new discussion board user.
 * 2. Create a new article for that user, including a set of (random number, 1-3)
 *    attachments.
 * 3. Call the /discussionBoard/user/articles/{articleId}/attachments index
 *    endpoint to list the attachments as the article author.
 * 4. Validate that all initially attached files are listed in the response and
 *    match input, and none have a non-null deleted_at (are not soft deleted).
 * 5. (Extra) Simulate soft-deletion by filtering the result and confirming deleted
 *    attachments are excluded (if API defaults to exclude).
 */
export async function test_api_user_article_attachment_index_as_author(
  connection: api.IConnection,
) {
  // 1. Register as a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const display_name = RandomGenerator.name();
  const avatar_url = undefined;
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      display_name,
      avatar_url,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);
  // 2. Create a new article WITH a set of attachments on creation
  const attachments = ArrayUtil.repeat(RandomGenerator.pick([1, 2, 3]), () => {
    // Select kind, filename, mimetype for business consistency
    const kind = RandomGenerator.pick([
      "image",
      "document",
      "archive",
    ] as const);
    // Kind => mimetype/filename mapping
    const attachment: IDiscussionBoardArticleAttachment.ICreate =
      kind === "image"
        ? {
            filename: `${RandomGenerator.alphaNumeric(8)}.jpg`,
            kind: "image",
            mimetype: "image/jpeg",
            filesize: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<5242880>
            >() satisfies number as number, // <= 5 MB
          }
        : kind === "document"
          ? {
              filename: `${RandomGenerator.alphaNumeric(8)}.pdf`,
              kind: "document",
              mimetype: "application/pdf",
              filesize: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1> &
                  tags.Maximum<5242880>
              >() satisfies number as number,
            }
          : {
              filename: `${RandomGenerator.alphaNumeric(8)}.zip`,
              kind: "archive",
              mimetype: "application/zip",
              filesize: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1> &
                  tags.Maximum<5242880>
              >() satisfies number as number,
            };
    return attachment;
  });
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        attachments,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  TestValidator.equals(
    "attachments created should match request",
    article.attachments.length,
    attachments.length,
  );
  // 3. Call the /attachments index endpoint as author
  const page =
    await api.functional.discussionBoard.user.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {},
      },
    );
  typia.assert(page);
  // 4. Validate:
  // All returned attachments match input length (none excluded)
  TestValidator.equals(
    "returned attachments count matches input",
    page.data.length,
    attachments.length,
  );
  for (const index in attachments) {
    const given = attachments[index];
    const returned = page.data[index];
    TestValidator.equals(
      `attachment #${index} filename matches`,
      returned.filename,
      given.filename,
    );
    TestValidator.equals(
      `attachment #${index} kind matches`,
      returned.kind,
      given.kind,
    );
    TestValidator.equals(
      `attachment #${index} mimetype matches`,
      returned.mimetype,
      given.mimetype,
    );
  }
  //5. Ensure all returned attachments are non-deleted (no soft deleted should appear)
  // Since ISummary does not contain deleted_at, validation consists of checking correct attachments only
}
