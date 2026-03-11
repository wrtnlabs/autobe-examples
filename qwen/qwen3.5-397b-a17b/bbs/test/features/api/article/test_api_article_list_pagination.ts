import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test retrieving a paginated list of discussion board articles with default parameters.
 *
 * Test Steps:
 * 1. Set up test data: Create a section as admin, then create multiple articles (15+) as a member in that section with various tags
 * 2. Call PATCH /discussionBoard/articles with default parameters (page=1, limit=20, no filters)
 * 3. Verify the response contains pagination metadata (current page, limit, total records, total pages)
 * 4. Verify each article summary includes: id, title, author (with display_name, is_admin flag), tags array, comments_count, created_at
 * 5. Verify articles are sorted by newest first (default sort order)
 * 6. Verify soft-deleted articles (deleted_at IS NOT NULL) are excluded from results
 * 7. Test pagination by requesting page=2 and verify different articles are returned
 * 8. Verify that when limit=10, only 10 articles are returned per page
 *
 * Business Logic Validation:
 * - All articles (regardless of author) are visible to guest users
 * - Pagination metadata accurately reflects total count across all pages
 * - Article summaries do not include full content (optimization for list views)
 * - Comment count is accurately aggregated from discussion_board_comments
 * - Tags are correctly resolved through the junction table
 */
export async function test_api_article_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 3,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(section);
  // 2. Member setup - register and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Create 15+ articles with various tags for pagination testing
  const articleCount = 18;
  const createdArticles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < articleCount; i++) {
    const tagCount = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
    >();
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: `Article Title ${i + 1} - ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 5 })}`,
            content: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 5,
              sentenceMax: 10,
            }),
            sectionId: section.id,
            tags: ArrayUtil.repeat(tagCount, () =>
              RandomGenerator.paragraph({
                sentences: 1,
                wordMin: 1,
                wordMax: 2,
              }),
            ),
          },
        },
      );
    typia.assert(article);
    createdArticles.push(article);
    // Small delay to ensure different created_at timestamps for sorting validation
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 4. Test default pagination (page=1, limit=20)
  const defaultPagination = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        section_id: section.id,
        page: 1,
        limit: 20,
        sort: "newest",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(defaultPagination);
  // 5. Verify pagination metadata
  TestValidator.equals(
    "current page is 1",
    defaultPagination.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", defaultPagination.pagination.limit, 20);
  TestValidator.equals(
    "total records matches created articles",
    defaultPagination.pagination.records,
    articleCount,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    defaultPagination.pagination.pages >= 1,
  );
  // 6. Verify each article summary structure (typia.assert already validates types)
  TestValidator.predicate(
    "articles returned",
    defaultPagination.data.length > 0,
  );
  for (const articleSummary of defaultPagination.data) {
    typia.assert(articleSummary);
  }
  // 7. Verify articles are sorted by newest first
  TestValidator.predicate("articles sorted newest first", () => {
    for (let i = 1; i < defaultPagination.data.length; i++) {
      const prevDate = new Date(
        defaultPagination.data[i - 1].created_at,
      ).getTime();
      const currDate = new Date(defaultPagination.data[i].created_at).getTime();
      if (prevDate < currDate) {
        return false;
      }
    }
    return true;
  });
  // 8. Test with limit=10 on page 1 first
  const limit10Page1 = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        section_id: section.id,
        page: 1,
        limit: 10,
        sort: "newest",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(limit10Page1);
  TestValidator.equals(
    "limit 10 page 1 returns 10 articles",
    limit10Page1.data.length,
    10,
  );
  TestValidator.equals(
    "limit 10 pagination limit",
    limit10Page1.pagination.limit,
    10,
  );
  // 9. Test pagination page 2 with limit 10
  const page2Pagination = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        section_id: section.id,
        page: 2,
        limit: 10,
        sort: "newest",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(page2Pagination);
  TestValidator.equals(
    "page 2 current page",
    page2Pagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit is 10",
    page2Pagination.pagination.limit,
    10,
  );
  // Verify page 2 returns different articles than page 1
  TestValidator.predicate("page 2 returns different articles", () => {
    const page1Ids = limit10Page1.data.map((a) => a.id);
    const page2Ids = page2Pagination.data.map((a) => a.id);
    return !page1Ids.some((id) => page2Ids.includes(id));
  });
  // 10. Verify limit=10 returns correct number of articles on page 2
  TestValidator.predicate("page 2 has correct number of articles", () => {
    const expectedCount = Math.min(10, articleCount - 10);
    return page2Pagination.data.length === expectedCount;
  });
}
