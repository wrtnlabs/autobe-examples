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

export async function test_api_article_attachment_document_upload_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://example.com/moderator/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create article category as moderator
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Articles about economic policies and markets",
          sort_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "member123",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        ip: "192.168.1.2",
        href: "https://example.com/member/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create article as member
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Switch back to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      ip: "192.168.1.1",
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/moderator/dashboard" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 6: Upload document attachment as moderator
  const documentSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<100000> & tags.Maximum<5000000>
  >();
  const attachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.moderator.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: "pdf",
          size: documentSize,
          original_filename:
            `research-paper-${RandomGenerator.alphaNumeric(8)}.pdf` satisfies string &
              tags.MaxLength<255>,
          storage_path: `/storage/documents/${article.id}/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Validation: Verify attachment metadata
  TestValidator.equals("attachment type is file", attachment.type, "file");
  TestValidator.equals("attachment format is pdf", attachment.format, "pdf");
  TestValidator.equals(
    "attachment article ID matches",
    attachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "attachment member ID is moderator",
    attachment.discussion_board_member_id,
    moderator.id,
  );
  TestValidator.predicate(
    "attachment size is within limits",
    attachment.size > 0 && attachment.size <= 10485760,
  );
  TestValidator.predicate(
    "original filename is preserved",
    attachment.original_filename.includes(".pdf"),
  );
  TestValidator.predicate(
    "storage path is assigned",
    attachment.storage_path.length > 0,
  );
}
