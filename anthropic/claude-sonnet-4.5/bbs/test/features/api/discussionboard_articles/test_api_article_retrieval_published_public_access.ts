import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that published articles can be retrieved by any user without
 * authentication.
 *
 * This validates the core public read functionality of the discussion board,
 * ensuring that published articles are accessible to all users including
 * unauthenticated guests.
 *
 * Steps:
 *
 * 1. Create moderator account for category creation
 * 2. Create member account to author the test article
 * 3. Create a category for article classification
 * 4. Create and publish an article with complete content
 * 5. Retrieve the article WITHOUT authentication (public access)
 * 6. Validate complete article data structure
 * 7. Verify view_count increments on each retrieval
 * 8. Confirm no authentication required for published articles
 */
export async function test_api_article_retrieval_published_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecureModPass123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: "https://test.example.com/moderator/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category (requires moderator authentication)
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description:
            "Discussions about economic policy, markets, and fiscal topics",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account to author the article
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecureMemPass123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
      href: "https://test.example.com/member/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create and publish an article with complete content
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });

  const createdArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(createdArticle);

  // Step 5: Retrieve the article WITHOUT authentication (public access)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const retrievedArticle = await api.functional.discussionBoard.articles.at(
    unauthenticatedConnection,
    { articleId: createdArticle.id },
  );
  typia.assert(retrievedArticle);

  // Step 6: Validate complete article data is returned
  TestValidator.equals(
    "article id matches",
    retrievedArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "article title matches",
    retrievedArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article body matches",
    retrievedArticle.body,
    articleBody,
  );
  TestValidator.equals(
    "article status is published",
    retrievedArticle.status,
    "published",
  );

  // Validate article metadata
  TestValidator.predicate(
    "article has valid slug",
    retrievedArticle.slug.length > 0,
  );
  TestValidator.predicate(
    "article excerpt exists",
    retrievedArticle.excerpt !== null && retrievedArticle.excerpt !== undefined,
  );
  TestValidator.predicate(
    "article is not edited initially",
    retrievedArticle.is_edited === false,
  );
  TestValidator.predicate(
    "published_at timestamp exists",
    retrievedArticle.published_at !== null &&
      retrievedArticle.published_at !== undefined,
  );

  // Validate author information is included
  TestValidator.equals(
    "author id matches member",
    retrievedArticle.author.id,
    member.id,
  );
  TestValidator.equals(
    "author username matches",
    retrievedArticle.author.username,
    member.username,
  );
  TestValidator.equals(
    "author display_name matches",
    retrievedArticle.author.display_name,
    member.display_name,
  );

  // Validate category information is included
  TestValidator.equals(
    "category id matches",
    retrievedArticle.category.id,
    category.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedArticle.category.name,
    category.name,
  );
  TestValidator.equals(
    "category slug matches",
    retrievedArticle.category.slug,
    category.slug,
  );
  TestValidator.equals(
    "category description matches",
    retrievedArticle.category.description,
    category.description,
  );
  TestValidator.equals(
    "category sort_order matches",
    retrievedArticle.category.sort_order,
    category.sort_order,
  );

  // Validate timestamps exist
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedArticle.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedArticle.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null for active article",
    retrievedArticle.deleted_at === null ||
      retrievedArticle.deleted_at === undefined,
  );

  // Step 7: Verify view_count increments on each retrieval
  const initialViewCount = retrievedArticle.view_count;
  TestValidator.predicate(
    "initial view_count is non-negative",
    initialViewCount >= 0,
  );

  const secondRetrievedArticle =
    await api.functional.discussionBoard.articles.at(
      unauthenticatedConnection,
      { articleId: createdArticle.id },
    );
  typia.assert(secondRetrievedArticle);

  TestValidator.predicate(
    "view_count incremented after second retrieval",
    secondRetrievedArticle.view_count > initialViewCount,
  );

  // Step 8: Confirm no authentication required - test already passed by successfully retrieving with empty headers
  TestValidator.predicate(
    "public access successful without authentication",
    true,
  );
}
