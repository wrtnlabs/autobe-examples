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

export async function test_api_article_contributor_update_rejected_article_resubmit(
  connection: api.IConnection,
) {
  // Step 1: Create a contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphabets(12),
      password: "SecurePass123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(12),
      password: "ModeratorPass123!",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create an article as contributor
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Economic Policy Analysis " + RandomGenerator.alphabets(5),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/new",
          referrer: "http://localhost:3000/",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article initial status is draft",
    article.status,
    "draft",
  );

  // Step 4: Switch to moderator account and reject the article
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const rejectionFeedback =
    "Please provide more specific data sources and citations for your claims. The content needs stronger evidence.";
  const rejectedArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: article.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionFeedback,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(rejectedArticle);
  TestValidator.equals(
    "article status is rejected",
    rejectedArticle.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason is set",
    rejectedArticle.rejection_reason,
    rejectionFeedback,
  );

  // Step 5: Switch back to contributor account and access rejection_reason
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: "SecurePass123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  TestValidator.predicate(
    "contributor can access rejection reason",
    rejectedArticle.rejection_reason !== null &&
      rejectedArticle.rejection_reason !== undefined,
  );

  // Step 6: Update the article content based on feedback
  const revisedContent = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 8,
    sentenceMax: 12,
  });
  const revisedTitle =
    "Economic Policy Analysis with Enhanced Data " +
    RandomGenerator.alphabets(3);

  const updatedArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          title: revisedTitle,
          content: revisedContent,
          status: "pending_approval",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);

  // Step 7: Validate status transition and content revisions
  TestValidator.equals(
    "updated article status is pending_approval",
    updatedArticle.status,
    "pending_approval",
  );
  TestValidator.notEquals(
    "article content has been revised",
    updatedArticle.content,
    article.content,
  );
  TestValidator.notEquals(
    "article title has been revised",
    updatedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "updated title matches submitted revision",
    updatedArticle.title,
    revisedTitle,
  );

  // Step 8: Verify article is in moderation queue (status is pending_approval for re-review)
  TestValidator.predicate(
    "article entered moderation queue with pending_approval status",
    updatedArticle.status === "pending_approval",
  );
}
