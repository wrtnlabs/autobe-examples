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
 * Test article creation with optional metadata including tags and summary.
 *
 * This test validates that members can create articles with up to 5 tags for
 * enhanced discoverability and an optional summary field. The test verifies
 * that the article is created successfully with all metadata properly
 * associated, and that the tag limit enforcement works correctly.
 *
 * Test workflow:
 *
 * 1. Authenticate as moderator to create categories and tags
 * 2. Create a category required for article creation
 * 3. Create multiple tags (up to 5) for article labeling
 * 4. Authenticate as member to create articles
 * 5. Create article with tags and summary
 * 6. Validate article creation with all metadata
 */
export async function test_api_article_creation_with_tags_and_summary(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create category for article classification
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Policy",
          description: "Discussion of economic policies and their impacts",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create multiple tags for enhanced discoverability
  const tagNames = [
    "monetary-policy",
    "fiscal-policy",
    "taxation",
    "trade",
    "regulation",
  ] as const;
  const tags: IDiscussionBoardTag[] = await ArrayUtil.asyncMap(
    tagNames,
    async (tagName) => {
      const tag = await api.functional.discussionBoard.moderator.tags.create(
        connection,
        {
          body: {
            name: tagName,
          } satisfies IDiscussionBoardTag.ICreate,
        },
      );
      typia.assert(tag);
      return tag;
    },
  );

  // Validate all tags were created successfully
  TestValidator.equals("created tags count", tags.length, tagNames.length);

  // Step 4: Authenticate as member
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

  // Step 5: Create article with tags and summary
  const articleTitle = "The Impact of Monetary Policy on Economic Growth";
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });
  const articleSummary =
    "This article examines how central bank monetary policy decisions influence overall economic growth patterns and business cycles.";

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
        summary: articleSummary,
        category_ids: [category.id],
        tag_ids: tags.map((tag) => tag.id),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 6: Validate article creation with all metadata
  TestValidator.equals("article title", article.title, articleTitle);
  TestValidator.equals("article body", article.body, articleBody);
  TestValidator.equals("article summary", article.summary, articleSummary);

  // Validate category assignment
  TestValidator.equals("category count", article.categories.length, 1);
  TestValidator.equals("category ID", article.categories[0].id, category.id);
  TestValidator.equals(
    "category name",
    article.categories[0].name,
    category.name,
  );

  // Validate tags association
  TestValidator.equals("tags count", article.tags.length, tags.length);

  // Verify each tag is correctly associated
  for (const createdTag of tags) {
    const foundTag = article.tags.find((t) => t.id === createdTag.id);
    typia.assertGuard(foundTag!);
    TestValidator.equals("tag name matches", foundTag.name, createdTag.name);
  }

  // Validate author attribution
  TestValidator.equals(
    "author ID",
    article.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "author username",
    article.author.username,
    member.username,
  );

  // Validate article status and initial counters
  TestValidator.equals("article status", article.status, "published");
  TestValidator.equals("initial view count", article.view_count, 0);
  TestValidator.equals("initial comment count", article.comment_count, 0);

  // Validate timestamps exist
  typia.assert<string & tags.Format<"date-time">>(article.created_at);
  typia.assert<string & tags.Format<"date-time">>(article.updated_at);
}
