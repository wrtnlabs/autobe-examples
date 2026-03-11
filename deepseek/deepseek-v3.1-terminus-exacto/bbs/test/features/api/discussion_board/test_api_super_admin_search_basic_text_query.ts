import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_super_admin_search_basic_text_query(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create test section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create first member and authenticate
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
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
  // 4. Create second member and authenticate
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
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
  // 5. Create third member and authenticate
  const member3Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member3Connection, {
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
  // 6. Create first article with search keyword in title
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      member1Connection,
      {
        body: {
          title: "The Future of Technology Innovation",
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  // 7. Create second article with search keyword in content
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      member2Connection,
      {
        body: {
          title: RandomGenerator.name(3),
          body: "This article discusses the latest advancements in technology and how they impact our daily lives. Technology continues to evolve rapidly.",
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  // 8. Create third article without search keyword
  const article3 =
    await generate_random_discussion_board_member_articles_create(
      member3Connection,
      {
        body: {
          title: RandomGenerator.name(3),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article3);
  // 9. Perform search operation with lowercase
  const searchResults =
    await api.functional.discussionBoard.superAdmin.search.index(
      superAdminConnection,
      {
        body: {
          search: "technology",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResults);
  // 10. Validate search results
  TestValidator.equals(
    "search results should contain pagination metadata",
    typeof searchResults.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination should have current page",
    searchResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination should have limit",
    searchResults.pagination.limit === 10,
  );
  TestValidator.predicate(
    "total records should be at least 2",
    searchResults.pagination.records >= 2,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    searchResults.pagination.pages ===
      Math.ceil(
        searchResults.pagination.records / searchResults.pagination.limit,
      ),
  );
  // 11. Validate that matching articles are included
  const matchingArticleIds = searchResults.data.map((article) => article.id);
  TestValidator.predicate(
    "article with keyword in title should be included",
    matchingArticleIds.includes(article1.id),
  );
  TestValidator.predicate(
    "article with keyword in content should be included",
    matchingArticleIds.includes(article2.id),
  );
  // 12. Validate that non-matching article is excluded
  TestValidator.predicate(
    "article without keyword should be excluded",
    !matchingArticleIds.includes(article3.id),
  );
  // 13. Validate article summary structure
  if (searchResults.data.length > 0) {
    const firstArticle = searchResults.data[0];
    TestValidator.equals(
      "article summary should have id",
      typeof firstArticle.id,
      "string",
    );
    TestValidator.equals(
      "article summary should have title",
      typeof firstArticle.title,
      "string",
    );
    TestValidator.equals(
      "article summary should have author",
      typeof firstArticle.author,
      "object",
    );
    TestValidator.equals(
      "article summary should have section",
      typeof firstArticle.section,
      "object",
    );
    TestValidator.equals(
      "article summary should have tags array",
      Array.isArray(firstArticle.tags),
      true,
    );
    TestValidator.equals(
      "article summary should have comments count",
      typeof firstArticle.comments_count,
      "number",
    );
    TestValidator.equals(
      "article summary should have creation timestamp",
      typeof firstArticle.created_at,
      "string",
    );
  }
  // 14. Test case-insensitive matching
  const caseInsensitiveSearch =
    await api.functional.discussionBoard.superAdmin.search.index(
      superAdminConnection,
      {
        body: {
          search: "TECHNOLOGY",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(caseInsensitiveSearch);
  TestValidator.predicate(
    "case-insensitive search should return same number of results",
    caseInsensitiveSearch.pagination.records ===
      searchResults.pagination.records,
  );
  // 15. Test partial word matching
  const partialSearch =
    await api.functional.discussionBoard.superAdmin.search.index(
      superAdminConnection,
      {
        body: {
          search: "tech",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(partialSearch);
  TestValidator.predicate(
    "partial word search should return matching articles",
    partialSearch.pagination.records >= 2,
  );
}
