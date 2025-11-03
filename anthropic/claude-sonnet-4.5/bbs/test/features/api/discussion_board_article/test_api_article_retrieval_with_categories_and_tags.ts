import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test retrieving an article with multiple categories and tags to validate
 * proper denormalization of junction table relationships.
 *
 * This test ensures that the article retrieval operation correctly returns all
 * associated categories and tags from the discussion_board_article_categories
 * and discussion_board_article_tags junction tables with complete metadata.
 *
 * Workflow:
 *
 * 1. Create member account for article authorship
 * 2. Create multiple categories for classification
 * 3. Create multiple tags for topic labeling
 * 4. Create article with multiple categories and tags
 * 5. Retrieve the article and validate all relationships are properly denormalized
 */
export async function test_api_article_retrieval_with_categories_and_tags(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Step 2: Create multiple categories (3 categories)
  const category1: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Policy Analysis",
          description:
            "In-depth analysis of economic policies and their impacts on markets and society",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category1);

  const category2: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Commentary",
          description:
            "Commentary and discussion on current political events and trends",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category2);

  const category3: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "International Relations",
          description:
            "Analysis of global political and economic relationships between nations",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category3);

  // Step 3: Create multiple tags (5 tags)
  const tag1: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: "monetary-policy",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(tag1);

  const tag2: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: "fiscal-policy",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(tag2);

  const tag3: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: "inflation",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(tag3);

  const tag4: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: "central-banking",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(tag4);

  const tag5: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: "quantitative-easing",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(tag5);

  // Step 4: Create article with multiple categories and tags
  const articleBody = {
    title: "The Impact of Modern Monetary Policy on Global Economic Stability",
    body: "This article examines how central banks worldwide are utilizing monetary policy tools to maintain economic stability in an increasingly interconnected global economy. We analyze the effectiveness of quantitative easing programs and their long-term implications for inflation and fiscal policy coordination.",
    summary:
      "Analysis of monetary policy effectiveness in maintaining global economic stability",
    category_ids: [category1.id, category2.id, category3.id],
    tag_ids: [tag1.id, tag2.id, tag3.id, tag4.id, tag5.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(createdArticle);

  // Step 5: Retrieve the article by ID
  const retrievedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(retrievedArticle);

  // Step 6: Validate categories are properly denormalized
  TestValidator.equals(
    "article should have 3 categories",
    retrievedArticle.categories.length,
    3,
  );

  // Verify each category contains complete metadata
  const categoryIds = retrievedArticle.categories.map((c) => c.id).sort();
  const expectedCategoryIds = [category1.id, category2.id, category3.id].sort();
  TestValidator.equals(
    "category IDs should match created categories",
    categoryIds,
    expectedCategoryIds,
  );

  // Step 7: Validate tags are properly denormalized
  TestValidator.equals(
    "article should have 5 tags",
    retrievedArticle.tags.length,
    5,
  );

  // Verify each tag contains complete metadata
  const tagIds = retrievedArticle.tags.map((t) => t.id).sort();
  const expectedTagIds = [tag1.id, tag2.id, tag3.id, tag4.id, tag5.id].sort();
  TestValidator.equals(
    "tag IDs should match created tags",
    tagIds,
    expectedTagIds,
  );

  // Step 8: Validate article metadata matches creation
  TestValidator.equals(
    "article ID should match",
    retrievedArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "article title should match",
    retrievedArticle.title,
    articleBody.title,
  );
  TestValidator.equals(
    "article body should match",
    retrievedArticle.body,
    articleBody.body,
  );
  TestValidator.equals(
    "article summary should match",
    retrievedArticle.summary,
    articleBody.summary,
  );
}
