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
 * Test that all article metadata fields are correctly returned with accurate
 * values and proper formatting.
 *
 * This test validates the complete metadata structure returned by the article
 * retrieval endpoint, ensuring all required fields are present, properly typed,
 * and correctly formatted according to the API specification. It verifies
 * nested objects (author, category), timestamp formats, UUID formats, string
 * length constraints, and data integrity.
 *
 * Test Flow:
 *
 * 1. Create moderator account for category management
 * 2. Create member account with complete profile (including display_name)
 * 3. Create article category with full metadata
 * 4. Create article with rich content ensuring excerpt generation
 * 5. Retrieve the created article
 * 6. Validate all required fields and their types
 * 7. Validate format constraints (UUIDs, ISO dates, string lengths)
 * 8. Validate nested object structures (author, category)
 * 9. Verify data integrity and completeness
 */
export async function test_api_article_retrieval_complete_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to manage categories
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: typia.random<string>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account with display_name for author metadata
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Switch to moderator to create category
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Create category with complete description
  const categoryName = RandomGenerator.name(2);
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch to member to create article
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Create article with rich content (minimum 50 chars for excerpt generation)
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
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

  // Step 5: Retrieve the article
  const retrievedArticle = await api.functional.discussionBoard.articles.at(
    connection,
    {
      articleId: createdArticle.id,
    },
  );
  typia.assert(retrievedArticle);

  // Step 6: Validate string length constraints
  TestValidator.predicate(
    "title length is 5-200 chars",
    retrievedArticle.title.length >= 5 && retrievedArticle.title.length <= 200,
  );
  TestValidator.predicate(
    "body length is 50-50000 chars",
    retrievedArticle.body.length >= 50 && retrievedArticle.body.length <= 50000,
  );

  // Step 7: Validate title matches created title
  TestValidator.equals(
    "title matches created article",
    retrievedArticle.title,
    articleTitle,
  );

  // Step 8: Validate body matches created body
  TestValidator.equals(
    "body matches created article",
    retrievedArticle.body,
    articleBody,
  );

  // Step 9: Validate slug is URL-friendly
  TestValidator.predicate(
    "slug is URL-friendly",
    /^[a-z0-9-]+$/.test(retrievedArticle.slug),
  );

  // Step 10: Validate status equals 'published'
  TestValidator.equals(
    "status is published",
    retrievedArticle.status,
    "published",
  );

  // Step 11: Validate view_count is non-negative integer
  TestValidator.predicate(
    "view_count is non-negative",
    retrievedArticle.view_count >= 0,
  );
  TestValidator.predicate(
    "view_count is integer",
    Number.isInteger(retrievedArticle.view_count),
  );

  // Step 12: Validate is_edited is false for new article
  TestValidator.equals(
    "is_edited is false for new article",
    retrievedArticle.is_edited,
    false,
  );

  // Step 13: Validate deleted_at is null for active article
  TestValidator.equals(
    "deleted_at is null for active article",
    retrievedArticle.deleted_at,
    null,
  );

  // Step 14: Validate author metadata
  TestValidator.equals(
    "author id matches member",
    retrievedArticle.author.id,
    member.id,
  );
  TestValidator.equals(
    "author username matches member",
    retrievedArticle.author.username,
    member.username,
  );

  if (member.display_name !== null && member.display_name !== undefined) {
    TestValidator.equals(
      "author display_name matches member",
      retrievedArticle.author.display_name,
      member.display_name,
    );
  }

  // Step 15: Validate category metadata
  TestValidator.equals(
    "category id matches created category",
    retrievedArticle.category.id,
    category.id,
  );
  TestValidator.equals(
    "category name matches created category",
    retrievedArticle.category.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches created category",
    retrievedArticle.category.slug,
    categorySlug,
  );

  // Step 16: Verify excerpt exists or is null (auto-generated from body)
  if (
    retrievedArticle.excerpt !== null &&
    retrievedArticle.excerpt !== undefined
  ) {
    TestValidator.predicate(
      "excerpt is string when present",
      typeof retrievedArticle.excerpt === "string",
    );
    TestValidator.predicate(
      "excerpt length is reasonable",
      retrievedArticle.excerpt.length <= 200,
    );
  }

  // Step 17: Verify all data integrity
  TestValidator.equals(
    "article id matches created article",
    retrievedArticle.id,
    createdArticle.id,
  );
}
