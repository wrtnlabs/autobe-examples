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
 * Test that a member can successfully change the categories and tags associated
 * with their article during an update.
 *
 * This test validates the many-to-many relationship management through junction
 * tables (discussion_board_article_categories and
 * discussion_board_article_tags). The test creates an article with specific
 * categories and tags, then updates it with different categories and tags,
 * verifying that the associations are correctly updated while maintaining the
 * constraint of at least one category and up to 5 tags.
 */
export async function test_api_article_update_category_and_tag_changes(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create multiple categories (3 categories for testing)
  const category1 =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Economic Policy ${RandomGenerator.alphaNumeric(4)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category1);

  const category2 =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Political Analysis ${RandomGenerator.alphaNumeric(4)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category2);

  const category3 =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `International Trade ${RandomGenerator.alphaNumeric(4)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category3);

  // Step 3: Create multiple tags (5 tags for testing)
  const tag1 = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: {
        name: `monetary-policy-${RandomGenerator.alphaNumeric(3)}`,
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag1);

  const tag2 = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: {
        name: `taxation-${RandomGenerator.alphaNumeric(3)}`,
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag2);

  const tag3 = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: {
        name: `healthcare-${RandomGenerator.alphaNumeric(3)}`,
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag3);

  const tag4 = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: {
        name: `climate-change-${RandomGenerator.alphaNumeric(3)}`,
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag4);

  const tag5 = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: {
        name: `trade-policy-${RandomGenerator.alphaNumeric(3)}`,
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag5);

  // Step 4: Create article with initial categories and tags
  const initialArticleData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    category_ids: [category1.id, category2.id],
    tag_ids: [tag1.id, tag2.id, tag3.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: initialArticleData,
    });
  typia.assert(createdArticle);

  // Verify initial article has correct categories and tags
  TestValidator.equals(
    "initial article has 2 categories",
    createdArticle.categories.length,
    2,
  );
  TestValidator.equals(
    "initial article has 3 tags",
    createdArticle.tags.length,
    3,
  );

  // Step 5: Update article with different categories and tags
  const updateData = {
    category_ids: [category2.id, category3.id],
    tag_ids: [tag3.id, tag4.id, tag5.id],
  } satisfies IDiscussionBoardArticle.IUpdate;

  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: createdArticle.id,
      body: updateData,
    });
  typia.assert(updatedArticle);

  // Step 6: Verify updated article has new categories and tags
  TestValidator.equals(
    "updated article has 2 categories",
    updatedArticle.categories.length,
    2,
  );
  TestValidator.equals(
    "updated article has 3 tags",
    updatedArticle.tags.length,
    3,
  );

  // Verify the categories changed
  const updatedCategoryIds = updatedArticle.categories.map((c) => c.id).sort();
  const expectedCategoryIds = [category2.id, category3.id].sort();
  TestValidator.equals(
    "categories updated correctly",
    updatedCategoryIds,
    expectedCategoryIds,
  );

  // Verify the tags changed
  const updatedTagIds = updatedArticle.tags.map((t) => t.id).sort();
  const expectedTagIds = [tag3.id, tag4.id, tag5.id].sort();
  TestValidator.equals("tags updated correctly", updatedTagIds, expectedTagIds);

  // Step 7: Verify at least one category constraint
  TestValidator.predicate(
    "at least one category is maintained",
    updatedArticle.categories.length >= 1,
  );

  // Step 8: Verify up to 5 tags constraint
  TestValidator.predicate(
    "up to 5 tags can be applied",
    updatedArticle.tags.length <= 5,
  );
}
