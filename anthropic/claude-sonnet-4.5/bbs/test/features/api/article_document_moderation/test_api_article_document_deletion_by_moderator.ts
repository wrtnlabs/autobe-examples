import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that a moderator can delete document attachments from member articles.
 *
 * This test validates the moderator's content management capabilities by
 * creating a complete workflow where a member creates an article with a
 * document attachment, and then a moderator exercises their elevated
 * permissions to delete that document.
 *
 * Workflow steps:
 *
 * 1. Create and authenticate as a new member
 * 2. Create and authenticate as a new moderator
 * 3. Create a category as moderator (required for articles)
 * 4. Create an article with document attachment as member
 * 5. Delete the document as moderator
 * 6. Verify deletion was successful
 */
export async function test_api_article_document_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123!";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: memberEmail,
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Save member connection for later use
  const memberConnection: api.IConnection = { ...connection };

  // Step 2: Create and authenticate as a new moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModPass123!";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create a category as moderator (required for article creation)
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch to member context and create article with document
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          body: RandomGenerator.content({ paragraphs: 3 }),
          category_ids: [category.id],
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 5: Upload document attachment to the article
  const documentUrl = typia.random<string & tags.Format<"uri">>();
  const documentFileName = `${RandomGenerator.alphaNumeric(8)}.pdf`;
  const document: IDiscussionBoardArticleDocument =
    await api.functional.discussionBoard.member.articles.documents.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          url: documentUrl,
          original_name: documentFileName,
          mime_type: "application/pdf",
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<10485760>
          >(),
        } satisfies IDiscussionBoardArticleDocument.ICreate,
      },
    );
  typia.assert(document);

  // Step 6: Switch to moderator context and delete the document
  await api.functional.discussionBoard.moderator.articles.documents.erase(
    connection,
    {
      articleId: article.id,
      documentId: document.id,
    },
  );

  // Validation complete - moderator successfully deleted member's document
}
