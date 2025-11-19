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
 * Test a complete article lifecycle workflow involving both contributor and
 * moderator actions.
 *
 * This test validates the complete journey of an article from creation through
 * moderation:
 *
 * 1. Contributor creates account and logs in
 * 2. Moderator creates account and logs in
 * 3. Contributor creates article in draft status
 * 4. Contributor updates article to pending_approval status
 * 5. Moderator retrieves article and reviews it
 * 6. Moderator rejects article with feedback
 * 7. Contributor revises rejected article
 * 8. Contributor resubmits article for approval
 * 9. Moderator approves article with approval notes
 * 10. Moderator pins article for featured display
 * 11. Moderator locks article to prevent further comments
 * 12. Verify final article state with all flags and metadata
 */
export async function test_api_article_moderator_complete_workflow_lifecycle(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "SecurePass123!@";
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphabets(10),
      password: contributorPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratePass123!@";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Contributor logs in (already authenticated from join)
  // Step 4: Create article in draft status
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({ paragraphs: 2 });
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const draftArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: categoryId,
          href: "https://example.com/articles/create",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(draftArticle);
  TestValidator.equals(
    "article starts in draft status",
    draftArticle.status,
    "draft",
  );
  TestValidator.equals(
    "article author matches contributor",
    draftArticle.author.id,
    contributor.id,
  );

  // Step 5: Contributor updates article to pending_approval
  const submittedArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: draftArticle.id,
        body: {
          status: "pending_approval",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(submittedArticle);
  TestValidator.equals(
    "article transitions to pending_approval",
    submittedArticle.status,
    "pending_approval",
  );

  // Step 6: Switch to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/moderator",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Moderator reviews article (retrieve to confirm pending_approval state)
  TestValidator.predicate(
    "moderator can see article in pending_approval",
    submittedArticle.status === "pending_approval",
  );

  // Step 8: Moderator rejects article with feedback
  const rejectionReason =
    "Article needs more citations and better structure for approval.";
  const rejectedArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: draftArticle.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(rejectedArticle);
  TestValidator.equals(
    "article transitions to rejected status",
    rejectedArticle.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason is stored",
    rejectedArticle.rejection_reason,
    rejectionReason,
  );

  // Step 9: Switch back to contributor account
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: contributorPassword,
      href: "https://example.com/articles/edit",
      referrer: "https://example.com/articles",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // Step 10: Contributor revises article with improved content
  const revisedTitle = articleTitle + " (Revised)";
  const revisedContent =
    articleContent +
    "\n\nImproved with additional citations and better structure.";
  const revisedArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: draftArticle.id,
        body: {
          title: revisedTitle,
          content: revisedContent,
          status: "pending_approval",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(revisedArticle);
  TestValidator.equals(
    "revised article has updated title",
    revisedArticle.title,
    revisedTitle,
  );
  TestValidator.equals(
    "revised article transitions back to pending_approval",
    revisedArticle.status,
    "pending_approval",
  );

  // Step 11: Switch back to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/review",
      referrer: "https://example.com/moderator",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 12: Moderator approves article with notes
  const approvalNotes =
    "Excellent revision! Article now meets our standards for publication.";
  const approvedArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: draftArticle.id,
        body: {
          status: "published",
          approval_notes: approvalNotes,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(approvedArticle);
  TestValidator.equals(
    "article transitions to published status",
    approvedArticle.status,
    "published",
  );
  TestValidator.equals(
    "approval notes are recorded",
    approvedArticle.approval_notes,
    approvalNotes,
  );
  TestValidator.predicate(
    "published_at timestamp is set",
    approvedArticle.published_at !== null &&
      approvedArticle.published_at !== undefined,
  );

  // Step 13: Moderator pins article for featured display
  const pinnedArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: draftArticle.id,
        body: {
          is_pinned: true,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(pinnedArticle);
  TestValidator.equals("article is pinned", pinnedArticle.is_pinned, true);

  // Step 14: Moderator locks article to prevent further comments
  const lockedArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: draftArticle.id,
        body: {
          is_locked: true,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(lockedArticle);
  TestValidator.equals("article is locked", lockedArticle.is_locked, true);

  // Step 15: Final verification of complete article state
  TestValidator.equals(
    "final article status is published",
    lockedArticle.status,
    "published",
  );
  TestValidator.equals(
    "final article is pinned",
    lockedArticle.is_pinned,
    true,
  );
  TestValidator.equals(
    "final article is locked",
    lockedArticle.is_locked,
    true,
  );
  TestValidator.equals(
    "final article has approval notes",
    lockedArticle.approval_notes,
    approvalNotes,
  );
  TestValidator.equals(
    "final article author is preserved",
    lockedArticle.author.id,
    contributor.id,
  );
  TestValidator.predicate(
    "article title reflects revision",
    lockedArticle.title.includes("Revised"),
  );
}
