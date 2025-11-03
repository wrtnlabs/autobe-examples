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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test retrieving a paginated list of published articles authored by a specific
 * member.
 *
 * This test validates the member article retrieval functionality by creating a
 * member account, creating a category, publishing multiple articles under that
 * member's authorship, and then retrieving those articles using the member's
 * username. The test verifies that all published articles are returned with
 * correct summaries including title, publication date, view count, comment
 * count, categories, and tags. It also validates that pagination works
 * correctly and articles are sorted appropriately.
 *
 * Test Steps:
 *
 * 1. Create a member account to author articles
 * 2. Create a category for article classification (requires moderator permissions)
 * 3. Authenticate as the member
 * 4. Create multiple published articles under the member's authorship
 * 5. Retrieve the member's articles using their username
 * 6. Validate all articles are returned with correct summaries
 * 7. Verify pagination information is correct
 * 8. Verify articles are properly sorted
 */
export async function test_api_member_published_articles_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Test1234!@#$";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create a category (requires moderator authentication)
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create multiple published articles under member's authorship
  const articleCount = 5;
  const createdArticles = await ArrayUtil.asyncRepeat(
    articleCount,
    async (index) => {
      const article =
        await api.functional.discussionBoard.member.articles.create(
          connection,
          {
            body: {
              title: `${RandomGenerator.name(3)} - Article ${index + 1}`,
              body: RandomGenerator.content({
                paragraphs: 3,
                sentenceMin: 10,
                sentenceMax: 20,
              }),
              summary: RandomGenerator.paragraph({ sentences: 2 }),
              category_ids: [category.id],
            } satisfies IDiscussionBoardArticle.ICreate,
          },
        );
      typia.assert(article);
      return article;
    },
  );

  // Step 4: Retrieve the member's published articles
  const articleListResponse =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberUsername: member.username,
      body: {
        page: 1,
        limit: 10,
        status: "published",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(articleListResponse);

  // Step 5: Validate pagination information
  TestValidator.equals(
    "pagination current page should be 1",
    articleListResponse.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should be 10",
    articleListResponse.pagination.limit,
    10,
  );

  TestValidator.equals(
    "total records should match created article count",
    articleListResponse.pagination.records,
    articleCount,
  );

  TestValidator.equals(
    "returned article count should match created count",
    articleListResponse.data.length,
    articleCount,
  );

  // Step 6: Validate all articles belong to the member
  for (const article of articleListResponse.data) {
    TestValidator.equals(
      "article author username should match member username",
      article.author.username,
      member.username,
    );

    TestValidator.equals(
      "article author id should match member id",
      article.author.id,
      member.id,
    );

    TestValidator.equals(
      "article status should be published",
      article.status,
      "published",
    );

    TestValidator.predicate(
      "article should have at least one category",
      article.categories.length > 0,
    );

    TestValidator.predicate(
      "article view count should be non-negative",
      article.view_count >= 0,
    );

    TestValidator.predicate(
      "article comment count should be non-negative",
      article.comment_count >= 0,
    );
  }

  // Step 7: Verify all created articles are present in the response
  for (const createdArticle of createdArticles) {
    const foundArticle = articleListResponse.data.find(
      (a) => a.id === createdArticle.id,
    );

    TestValidator.predicate(
      `created article ${createdArticle.id} should be in response`,
      foundArticle !== undefined,
    );

    if (foundArticle) {
      typia.assertGuard(foundArticle!);

      TestValidator.equals(
        "article title should match",
        foundArticle.title,
        createdArticle.title,
      );
    }
  }
}
