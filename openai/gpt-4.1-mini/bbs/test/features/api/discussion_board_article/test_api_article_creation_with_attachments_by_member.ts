import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the creation of a new discussion board article by an authenticated
 * member including multiple attachments.
 *
 * This test covers the user journey from member registration to article
 * creation with attachments. It verifies that the member can successfully
 * create an article with valid title and markdown content, attach multiple
 * files with required metadata, and receive proper response data.
 *
 * Steps:
 *
 * 1. Authenticate a new member by joining with email and password.
 * 2. Create a discussion board article using the authenticated member connection.
 * 3. Provide multiple attachments including images and files with filename,
 *    file_type, and file_url.
 * 4. Validate that the response article matches request data in title and content.
 * 5. Validate that all attachments are linked correctly with matching metadata.
 */
export async function test_api_article_creation_with_attachments_by_member(
  connection: api.IConnection,
) {
  // 1. Member join (authentication)
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd123";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Prepare attachments array
  const attachments = ArrayUtil.repeat(3, (_index) => {
    const fileType = RandomGenerator.pick(["image", "file"] as const);
    const fileName =
      fileType === "image"
        ? `${RandomGenerator.name(1)}.png`
        : `${RandomGenerator.name(1)}.pdf`;
    const fileUrl = `https://cdn.example.com/${fileName.toLowerCase()}`;
    return {
      filename: fileName,
      file_type: fileType,
      file_url: fileUrl,
    };
  });

  // 3. Create a discussion board article with attachments
  const title = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const contentMarkdown =
    "# " + title + "\n" + RandomGenerator.content({ paragraphs: 3 });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: {
          title,
          content_markdown: contentMarkdown,
          discussion_board_attachments: attachments,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 4. Validate returned article data
  TestValidator.equals("article title matches", article.title, title);
  TestValidator.equals(
    "article content_markdown matches",
    article.content_markdown,
    contentMarkdown,
  );

  // 5. Validate attachments metadata
  TestValidator.equals(
    "article discussion_board_attachments length matches",
    article.discussion_board_attachments.length,
    attachments.length,
  );

  // Map by filename to quickly find corresponding returned attachment
  const returnedAttachmentsMap = new Map(
    article.discussion_board_attachments.map((attachment) => [
      attachment.filename,
      attachment,
    ]),
  );

  for (const attachment of attachments) {
    const returned = returnedAttachmentsMap.get(attachment.filename);
    TestValidator.predicate(
      `attachment '${attachment.filename}' must exist in response`,
      returned !== undefined && returned !== null,
    );
    if (returned !== undefined && returned !== null) {
      TestValidator.equals(
        `attachment '${attachment.filename}' file_type matches`,
        returned.file_type,
        attachment.file_type,
      );
      TestValidator.equals(
        `attachment '${attachment.filename}' file_url matches`,
        returned.file_url,
        attachment.file_url,
      );
      // Validate that the attachment is linked to the correct article
      TestValidator.equals(
        `attachment '${attachment.filename}' linked to article`,
        returned.discussion_board_article_id,
        article.id,
      );
      // Validate id and timestamps presence and format
      TestValidator.predicate(
        `attachment '${attachment.filename}' has valid id format`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          returned.id,
        ),
      );
      TestValidator.predicate(
        `attachment '${attachment.filename}' has valid created_at format`,
        typeof returned.created_at === "string" &&
          returned.created_at.length > 0,
      );
      TestValidator.predicate(
        `attachment '${attachment.filename}' has valid updated_at format`,
        typeof returned.updated_at === "string" &&
          returned.updated_at.length > 0,
      );
      // deleted_at can be null or undefined
      TestValidator.predicate(
        `attachment '${attachment.filename}' deleted_at is null or undefined`,
        returned.deleted_at === null || returned.deleted_at === undefined,
      );
    }
  }
}
