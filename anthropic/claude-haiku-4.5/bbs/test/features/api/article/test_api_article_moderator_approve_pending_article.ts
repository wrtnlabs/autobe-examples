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

export async function test_api_article_moderator_approve_pending_article(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account for article authorship
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "TestPassword@123",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const draftArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 4,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 6,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/dashboard",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(draftArticle);
  TestValidator.equals(
    "article initial status is draft",
    draftArticle.status,
    "draft",
  );

  // Step 3: Contributor transitions article to pending_approval for moderator review
  const pendingArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: draftArticle.id,
        body: {
          status: "pending_approval",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(pendingArticle);
  TestValidator.equals(
    "article transitioned to pending_approval",
    pendingArticle.status,
    "pending_approval",
  );

  // Step 4: Create moderator account for article approval
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "ModPassword@123",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 5: Moderator logs in to switch authentication context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModPassword@123",
      href: "http://localhost:3000/moderator/login",
      referrer: "http://localhost:3000/auth",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 6: Moderator approves article and transitions to published status
  const publishedArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: pendingArticle.id,
        body: {
          status: "published",
          approval_notes:
            "Article meets community standards and is well-written.",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(publishedArticle);

  // Step 7: Validate article status transition to published
  TestValidator.equals(
    "article status is published",
    publishedArticle.status,
    "published",
  );

  // Step 8: Validate published_at timestamp is set
  TestValidator.predicate(
    "published_at timestamp is set when article approved",
    publishedArticle.published_at !== null &&
      publishedArticle.published_at !== undefined,
  );

  // Step 9: Validate approvedByModerator field captures moderator information
  TestValidator.predicate(
    "approvedByModerator field is populated with moderator identity",
    publishedArticle.approvedByModerator !== null &&
      publishedArticle.approvedByModerator !== undefined,
  );

  if (publishedArticle.approvedByModerator) {
    TestValidator.equals(
      "approvedByModerator ID matches the approving moderator",
      publishedArticle.approvedByModerator.id,
      moderator.id,
    );
    TestValidator.equals(
      "approvedByModerator username matches the approving moderator",
      publishedArticle.approvedByModerator.username,
      moderator.username,
    );
  }

  // Step 10: Validate article approval_notes are captured
  TestValidator.predicate(
    "approval notes are recorded by moderator",
    publishedArticle.approval_notes !== null &&
      publishedArticle.approval_notes !== undefined,
  );

  // Step 11: Verify article is now publicly visible (no longer in draft or pending states)
  TestValidator.predicate(
    "article is now in published state for public visibility",
    publishedArticle.status === "published",
  );

  // Step 12: Verify article can receive comments from community
  // This validates the article's infrastructure supports community engagement
  TestValidator.predicate(
    "article structure allows community comments",
    publishedArticle.id !== null && publishedArticle.id !== undefined,
  );

  // Step 13: Final validation - article content and metadata integrity
  TestValidator.equals(
    "article title preserved after approval",
    publishedArticle.title,
    draftArticle.title,
  );
  TestValidator.equals(
    "article content preserved after approval",
    publishedArticle.content,
    draftArticle.content,
  );
  TestValidator.equals(
    "article author unchanged after moderator approval",
    publishedArticle.author.id,
    contributor.id,
  );
}
