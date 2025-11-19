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
 * Test moderator ability to unpin a pinned article.
 *
 * Validates that a moderator can remove a pinned article from featured display
 * by setting is_pinned to false. Verifies the pin status change is properly
 * reflected in the article state and that unpinning is reversible.
 *
 * Workflow:
 *
 * 1. Create contributor and moderator accounts
 * 2. Contributor creates and submits article for approval
 * 3. Moderator approves and pins the article for featured display
 * 4. Verify article is pinned (is_pinned = true)
 * 5. Moderator unpins the article (is_pinned = false)
 * 6. Verify article is no longer pinned
 * 7. Moderator repins the article to verify reversibility
 * 8. Verify article is pinned again
 */
export async function test_api_article_moderator_unpin_article(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "SecurePass123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/home",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "ModeratorPass123!",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create article with a valid category ID
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Contributor creates article
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
            paragraphs: 3,
            sentenceMin: 8,
            sentenceMax: 12,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article created in draft status",
    article.status,
    "draft",
  );

  // Step 5: Contributor submits article for approval
  const submittedArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          status: "pending_approval",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(submittedArticle);
  TestValidator.equals(
    "article transitioned to pending_approval",
    submittedArticle.status,
    "pending_approval",
  );

  // Step 6: Switch to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      href: "http://localhost:3000/moderator/login",
      referrer: "http://localhost:3000/moderator",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Moderator approves and pins the article
  const pinnedArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: article.id,
        body: {
          status: "published",
          is_pinned: true,
          approval_notes: "Excellent article. Pinning for featured display.",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(pinnedArticle);
  TestValidator.equals("article published", pinnedArticle.status, "published");
  TestValidator.predicate(
    "article is pinned",
    pinnedArticle.is_pinned === true,
  );

  // Step 8: Moderator unpins the article
  const unpinnedArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: article.id,
        body: {
          is_pinned: false,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(unpinnedArticle);
  TestValidator.predicate(
    "article is no longer pinned",
    unpinnedArticle.is_pinned === false,
  );
  TestValidator.equals(
    "article status remains published after unpin",
    unpinnedArticle.status,
    "published",
  );

  // Step 9: Verify unpinning is reversible - repin the article
  const repinnedArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: article.id,
        body: {
          is_pinned: true,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(repinnedArticle);
  TestValidator.predicate(
    "article is pinned again after repin",
    repinnedArticle.is_pinned === true,
  );
  TestValidator.equals(
    "article status remains published after repin",
    repinnedArticle.status,
    "published",
  );
}
