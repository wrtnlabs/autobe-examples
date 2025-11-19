import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_article_attachment_filename_preservation(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        username: RandomGenerator.name(1),
        href: "https://example.com/moderator/join",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          slug: "general-discussion",
          description: "General discussion category for testing",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "member123",
        username: RandomGenerator.name(1),
        href: "https://example.com/member/join",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Test Article for Attachment Filename Preservation",
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  const simpleFilename = "report.pdf";
  const attachment1: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: "pdf",
          size: 50000,
          original_filename: simpleFilename,
          storage_path: `/uploads/attachments/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment1);
  TestValidator.equals(
    "simple filename preserved",
    attachment1.original_filename,
    simpleFilename,
  );

  const filenameWithSpaces = "Market Analysis 2024.docx";
  const attachment2: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: "docx",
          size: 75000,
          original_filename: filenameWithSpaces,
          storage_path: `/uploads/attachments/${typia.random<string & tags.Format<"uuid">>()}.docx`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment2);
  TestValidator.equals(
    "filename with spaces preserved",
    attachment2.original_filename,
    filenameWithSpaces,
  );

  const filenameWithSpecialChars = "Budget&Report-2024_Final(v2).xlsx";
  const attachment3: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: "xlsx",
          size: 120000,
          original_filename: filenameWithSpecialChars,
          storage_path: `/uploads/attachments/${typia.random<string & tags.Format<"uuid">>()}.xlsx`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment3);
  TestValidator.equals(
    "filename with special characters preserved",
    attachment3.original_filename,
    filenameWithSpecialChars,
  );

  const longFilename = RandomGenerator.alphabets(240) + "_document.txt";
  const attachment4: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: "txt",
          size: 8000,
          original_filename: longFilename,
          storage_path: `/uploads/attachments/${typia.random<string & tags.Format<"uuid">>()}.txt`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment4);
  TestValidator.equals(
    "long filename preserved",
    attachment4.original_filename,
    longFilename,
  );
  TestValidator.predicate(
    "long filename within limit",
    attachment4.original_filename.length <= 255,
  );

  const imageFilename = "chart_diagram.png";
  const attachment5: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: "png",
          size: 450000,
          original_filename: imageFilename,
          storage_path: `/uploads/attachments/${typia.random<string & tags.Format<"uuid">>()}.png`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment5);
  TestValidator.equals(
    "image filename preserved",
    attachment5.original_filename,
    imageFilename,
  );

  const jpegFilename = "Photo 2024-01-15.jpeg";
  const attachment6: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: "jpeg",
          size: 1200000,
          original_filename: jpegFilename,
          storage_path: `/uploads/attachments/${typia.random<string & tags.Format<"uuid">>()}.jpeg`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment6);
  TestValidator.equals(
    "jpeg filename preserved",
    attachment6.original_filename,
    jpegFilename,
  );

  TestValidator.predicate(
    "all attachments have filenames",
    [
      attachment1,
      attachment2,
      attachment3,
      attachment4,
      attachment5,
      attachment6,
    ].every(
      (att) =>
        att.original_filename !== null &&
        att.original_filename !== undefined &&
        att.original_filename.length > 0,
    ),
  );
}
