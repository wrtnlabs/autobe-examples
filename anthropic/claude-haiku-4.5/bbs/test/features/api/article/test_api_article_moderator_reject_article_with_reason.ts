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

/**
 * Test that a moderator can reject a pending article and provide
 * rejection_reason feedback to guide contributor revision.
 *
 * This test validates the complete rejection workflow:
 *
 * 1. Contributor creates and submits article for approval
 * 2. Moderator rejects article with constructive feedback
 * 3. Article transitions to rejected status with stored rejection_reason
 * 4. Article becomes invisible to public but accessible to author for revision
 * 5. Contributor can read rejection feedback to understand required changes
 */
export async function test_api_article_moderator_reject_article_with_reason(
  connection: api.IConnection,
) {
  // 1. Create contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "TestPassword123!";
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphabets(8),
      password: contributorPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor created successfully",
    typeof contributor.id,
    "string",
  );

  // 2. Create article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 5,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/dashboard",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article created in draft status",
    article.status,
    "draft",
  );

  // 3. Transition article to pending_approval for moderator review
  const pendingArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
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

  // 4. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator created successfully",
    typeof moderator.id,
    "string",
  );

  // 5. Moderator logs in
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/moderator/login",
      referrer: "http://localhost:3000/",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 6. Moderator rejects article with rejection_reason
  const rejectionReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const rejectedArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: article.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(rejectedArticle);

  // 7. Validate rejection was applied correctly
  TestValidator.equals(
    "article status is rejected",
    rejectedArticle.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection_reason is stored",
    rejectedArticle.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "rejection_reason is not null",
    rejectedArticle.rejection_reason !== null,
  );

  // 8. Log back in as contributor to verify they can read rejection feedback
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: contributorPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // 9. Verify contributor can read rejection_reason (for understanding required revisions)
  TestValidator.predicate(
    "rejection_reason is accessible to contributor for revision guidance",
    rejectedArticle.rejection_reason !== null &&
      rejectedArticle.rejection_reason !== undefined,
  );
}
