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
 * Test that a moderator can update any article in the system regardless of who
 * authored it.
 *
 * This test validates that moderator permissions override contributor ownership
 * restrictions. A contributor creates an article, and a different moderator
 * updates that contributor's article without ownership restrictions that apply
 * to contributors.
 *
 * Test workflow:
 *
 * 1. Create contributor account and authenticate
 * 2. Get a valid article category for creation
 * 3. Create an article in draft status with contributor as author
 * 4. Transition article from draft to pending_approval status
 * 5. Create a different moderator account and authenticate
 * 6. Moderator updates the article (status, approval notes, pin/lock flags)
 * 7. Validate that moderator successfully modified the article
 * 8. Verify article reflects all moderator changes
 */
export async function test_api_article_moderator_update_any_article_regardless_author(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account and authenticate
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "TestPassword123!";
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphabets(12),
      password: contributorPassword,
      href: "http://localhost:3000/auth/contributor/join",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor account created",
    contributor.id !== undefined,
  );

  // Step 2: Get a valid category ID for article creation
  // We'll create a category-like ID for testing
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create an article in draft status
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    categoryId: categoryId,
    href: "http://localhost:3000/contributor/articles/create",
    referrer: "http://localhost:3000",
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: articleData,
      },
    );
  typia.assert(createdArticle);
  TestValidator.equals(
    "article created in draft status",
    createdArticle.status,
    "draft",
  );
  TestValidator.equals(
    "article author is contributor",
    createdArticle.author.id,
    contributor.id,
  );

  // Step 4: Transition article to pending_approval
  const updatedToPending =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: createdArticle.id,
        body: {
          status: "pending_approval",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedToPending);
  TestValidator.equals(
    "article transitioned to pending_approval",
    updatedToPending.status,
    "pending_approval",
  );

  // Step 5: Create moderator account and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(12),
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created",
    moderator.id !== undefined,
  );

  // Step 6: Moderator updates the article (status, approval notes, pin/lock)
  const approvalNotes = RandomGenerator.paragraph({ sentences: 3 });
  const moderatorUpdate =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: createdArticle.id,
        body: {
          status: "published",
          approval_notes: approvalNotes,
          is_pinned: true,
          is_locked: false,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(moderatorUpdate);

  // Step 7 & 8: Validate moderator changes
  TestValidator.equals(
    "article status changed to published by moderator",
    moderatorUpdate.status,
    "published",
  );
  TestValidator.equals(
    "approval notes set by moderator",
    moderatorUpdate.approval_notes,
    approvalNotes,
  );
  TestValidator.equals(
    "article is pinned by moderator",
    moderatorUpdate.is_pinned,
    true,
  );
  TestValidator.equals(
    "article is not locked",
    moderatorUpdate.is_locked,
    false,
  );
  TestValidator.predicate(
    "published_at timestamp is set",
    moderatorUpdate.published_at !== null &&
      moderatorUpdate.published_at !== undefined,
  );
  TestValidator.equals(
    "original author remains unchanged",
    moderatorUpdate.author.id,
    contributor.id,
  );
}
