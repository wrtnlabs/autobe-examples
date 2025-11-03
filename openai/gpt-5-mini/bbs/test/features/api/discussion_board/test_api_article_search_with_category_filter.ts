import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Validate public article search filtered by category.
 *
 * Business context:
 *
 * - Moderators can create categories that organize articles.
 * - Members author articles and may publish them to make them visible to
 *   anonymous public callers.
 *
 * Test steps:
 *
 * 1. Create moderator account and use it to create a category (name + slug).
 * 2. Create a member account and use it to create two articles assigned to that
 *    category: one published and one draft.
 * 3. As an anonymous caller (no auth header), call the article search endpoint
 *    filtering by the created category id and verify only the published article
 *    is returned and pagination metadata is valid.
 * 4. Call the search endpoint with excessive paging parameters and assert an error
 *    is thrown or server enforces limits.
 */
export async function test_api_article_search_with_category_filter(
  connection: api.IConnection,
) {
  // 1) Moderator signs up to create a category
  const moderatorUsername = `moderator_${RandomGenerator.alphaNumeric(6)}`;
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: "Moderator#2025!",
      href: "https://example.com/moderator/signup",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert<IDiscussionBoardModerator.IAuthorized>(moderator);

  // 2) Create a category as moderator
  const categoryName = `test-category-${RandomGenerator.alphabets(4)}`;
  const categorySlug =
    categoryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `cat-${RandomGenerator.alphaNumeric(3)}`;
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert<IDiscussionBoardCategory>(category);

  // 3) Member joins and creates articles
  const memberUsername = `member_${RandomGenerator.alphaNumeric(6)}`;
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: "Member#2025!",
      href: "https://example.com/member/signup",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert<IDiscussionBoardMember.IAuthorized>(member);

  // Create a published article assigned to the created category (by slug)
  const publishedArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 6 }).trim(),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_slug: category.slug,
        state: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert<IDiscussionBoardArticle>(publishedArticle);

  // Create a draft article assigned to the same category
  const draftArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }).trim(),
        content: RandomGenerator.content({ paragraphs: 1 }),
        category_slug: category.slug,
        state: "draft",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert<IDiscussionBoardArticle>(draftArticle);

  // 4) Anonymous/public search by category (use category_id filter)
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const searchResult = await api.functional.discussionBoard.articles.index(
    publicConn,
    {
      body: {
        category_id: category.id,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert<IPageIDiscussionBoardArticle.ISummary>(searchResult);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current should be >= 1",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    searchResult.pagination.limit >= 1,
  );
  // Sanity: pages consistent with records/limit when records > 0
  if (searchResult.pagination.records > 0)
    TestValidator.predicate(
      "pagination pages should be at least 1 when records exist",
      searchResult.pagination.pages >= 1,
    );

  // Published article should appear
  TestValidator.predicate(
    "published article is present in search results",
    searchResult.data.some((a) => a.id === publishedArticle.id),
  );

  // Draft article should NOT be visible to anonymous search
  TestValidator.predicate(
    "draft article is excluded from public search",
    !searchResult.data.some((a) => a.id === draftArticle.id),
  );

  // 5) Invalid/excessive paging should produce an error or be rejected by server
  await TestValidator.error(
    "excessive paging parameters should be rejected or error",
    async () => {
      await api.functional.discussionBoard.articles.index(publicConn, {
        body: {
          page: 9999999,
          limit: 100000,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    },
  );
}
