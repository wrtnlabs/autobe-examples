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

export async function test_api_article_moderator_pin_article_for_featured_display(
  connection: api.IConnection,
) {
  // Step 1: Create first contributor account for article authorship
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphabets(8),
      password: "SecurePass123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create article category reference - use a valid UUID for category
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create first article in draft status
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "initial article status should be draft",
    article.status,
    "draft",
  );
  TestValidator.equals(
    "article should not be pinned initially",
    article.is_pinned,
    false,
  );

  // Step 4: Transition article to pending_approval
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
    "article status should be pending_approval",
    submittedArticle.status,
    "pending_approval",
  );

  // Step 5: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: "ModeratorPass123!",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 6: Moderator login to establish authenticated session
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      href: "http://localhost:3000/moderator/login",
      referrer: "http://localhost:3000/moderator",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Moderator approves and pins the first article
  const approvedArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: article.id,
        body: {
          status: "published",
          is_pinned: true,
          approval_notes:
            "Well-written discussion article approved for featured display",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(approvedArticle);
  TestValidator.equals(
    "article status should be published",
    approvedArticle.status,
    "published",
  );
  TestValidator.equals(
    "article should be pinned",
    approvedArticle.is_pinned,
    true,
  );

  // Step 8: Create second contributor account
  const contributorEmail2 = typia.random<string & tags.Format<"email">>();
  const contributor2 = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail2,
      username: RandomGenerator.alphabets(8),
      password: "SecurePass123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor2);

  // Step 9: Switch to second contributor context to create second article
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail2,
      password: "SecurePass123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // Step 10: Create second article in draft status
  const article2 =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);

  // Step 11: Submit second article for approval
  const submittedArticle2 =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article2.id,
        body: {
          status: "pending_approval",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(submittedArticle2);

  // Step 12: Switch back to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      href: "http://localhost:3000/moderator/login",
      referrer: "http://localhost:3000/moderator",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 13: Moderator approves and pins second article
  const pinnedArticle2 =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: article2.id,
        body: {
          status: "published",
          is_pinned: true,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(pinnedArticle2);
  TestValidator.equals(
    "second article should be pinned",
    pinnedArticle2.is_pinned,
    true,
  );

  // Step 14: Verify pin status persistence for both articles
  TestValidator.predicate(
    "first article remains pinned",
    approvedArticle.is_pinned === true,
  );
  TestValidator.predicate(
    "second article is pinned",
    pinnedArticle2.is_pinned === true,
  );

  // Step 15: Validate moderator can unpin articles
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
  TestValidator.equals(
    "article should be unpinned after moderator action",
    unpinnedArticle.is_pinned,
    false,
  );
}
