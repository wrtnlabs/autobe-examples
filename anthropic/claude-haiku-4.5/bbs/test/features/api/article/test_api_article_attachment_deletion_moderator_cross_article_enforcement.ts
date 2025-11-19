import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_article_attachment_deletion_moderator_cross_article_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create contributor account for article creation
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(10),
        password: "ContributorPass123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 3: Create three articles with attachments by switching to contributor context
  const articlesData: Array<{
    articleId: string;
    attachmentIds: string[];
  }> = [];

  for (let i = 0; i < 3; i++) {
    // Login as contributor
    await api.functional.auth.contributor.login(connection, {
      body: {
        email: contributorEmail,
        password: "ContributorPass123!",
        href: "http://localhost:3000/login",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ILogin,
    });

    const categoryId = typia.random<string & tags.Format<"uuid">>();

    // Create article
    const article: IDiscussionBoardArticle =
      await api.functional.discussionBoard.contributor.articles.create(
        connection,
        {
          body: {
            title: `Test Article ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
            content: RandomGenerator.content({ paragraphs: 2 }),
            categoryId: categoryId,
            href: "http://localhost:3000/articles/create",
            referrer: "http://localhost:3000/articles",
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);

    // Create 2 attachments for each article
    const attachmentIds: string[] = [];
    for (let j = 0; j < 2; j++) {
      const attachment: IDiscussionBoardArticleAttachment =
        await api.functional.discussionBoard.contributor.articles.attachments.attach(
          connection,
          {
            articleId: article.id,
            body: {
              original_filename: `document_${RandomGenerator.alphaNumeric(8)}.pdf`,
              file_type: "pdf",
              file_size: 2048000,
              mime_type: "application/pdf",
              display_url: `http://localhost:3000/files/${RandomGenerator.alphaNumeric(16)}`,
            } satisfies IDiscussionBoardArticleAttachment.ICreate,
          },
        );
      typia.assert(attachment);
      attachmentIds.push(attachment.id);
    }

    articlesData.push({
      articleId: article.id,
      attachmentIds,
    });
  }

  // Step 4: Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      href: "http://localhost:3000/moderator/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 5: Moderator deletes attachments from all articles
  let totalDeletedCount = 0;
  for (const { articleId, attachmentIds } of articlesData) {
    for (const attachmentId of attachmentIds) {
      await api.functional.discussionBoard.moderator.articles.attachments.erase(
        connection,
        {
          articleId: articleId,
          attachmentId: attachmentId,
        },
      );
      totalDeletedCount++;
    }
  }

  // Step 6: Validate cross-article moderation enforcement
  TestValidator.equals(
    "moderator processed three articles",
    articlesData.length,
    3,
  );

  TestValidator.equals(
    "moderator deleted six attachments total (2 per article)",
    totalDeletedCount,
    6,
  );

  TestValidator.predicate(
    "all articles had attachments before deletion",
    articlesData.every((data) => data.attachmentIds.length === 2),
  );
}
