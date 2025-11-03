import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_article_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Authenticate as new member
  const email = typia.random<string & tags.Format<"email">>();
  const password = "password123";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a new discussion board article with attachments
  const title = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 10,
  });
  const content_markdown = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 3,
    wordMax: 10,
  });

  // Generate 2 attachments
  const attachments = ArrayUtil.repeat(2, () => {
    const filename =
      RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }) +
      ".png";
    const file_type = "image/png";
    const file_url = `https://example.com/files/${RandomGenerator.alphaNumeric(10)}.png`;
    return { filename, file_type, file_url };
  });

  const created: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: {
          title,
          content_markdown,
          discussion_board_attachments: attachments,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(created);

  // Validate that title and content in the response match
  TestValidator.equals("article title equals input", created.title, title);
  TestValidator.equals(
    "article content equals input",
    created.content_markdown,
    content_markdown,
  );

  // Validate the attachments response
  TestValidator.equals(
    "number of attachments",
    created.discussion_board_attachments.length,
    attachments.length,
  );

  for (let i = 0; i < attachments.length; i++) {
    const inputAttachment = attachments[i];
    const responseAttachment = created.discussion_board_attachments[i];
    TestValidator.equals(
      "attachment filename",
      responseAttachment.filename,
      inputAttachment.filename,
    );
    TestValidator.equals(
      "attachment file type",
      responseAttachment.file_type,
      inputAttachment.file_type,
    );
    TestValidator.equals(
      "attachment file url",
      responseAttachment.file_url,
      inputAttachment.file_url,
    );
  }

  // Check that id and timestamps are present and valid
  TestValidator.predicate(
    "article id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      created.id,
    ),
  );
  TestValidator.predicate(
    "article created_at datetime",
    created.created_at.length > 0,
  );
  TestValidator.predicate(
    "article updated_at datetime",
    created.updated_at.length > 0,
  );
}
