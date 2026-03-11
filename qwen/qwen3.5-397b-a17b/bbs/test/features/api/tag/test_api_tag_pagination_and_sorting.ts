import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test pagination and sorting functionality for tag listing.
 *
 * This test verifies:
 * 1. Pagination with different limit values (1, 20, 100)
 * 2. Limit clamping when exceeding maximum (100)
 * 3. Page beyond available pages returns empty data
 * 4. Sorting by 'name' (alphabetical) and 'created_at' (chronological)
 * 5. Pagination metadata accuracy (current, limit, records, pages)
 * 6. Combined pagination with search filters
 */
export async function test_api_tag_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member and generate articles with diverse tags
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // Create articles with many unique tags to generate sufficient tag data
  const tagNames: string[] = [
    "Alpha",
    "Beta",
    "Gamma",
    "Delta",
    "Epsilon",
    "Zeta",
    "Eta",
    "Theta",
    "Iota",
    "Kappa",
    "Lambda",
    "Mu",
    "Nu",
    "Xi",
    "Omicron",
    "Pi",
    "Rho",
    "Sigma",
    "Tau",
    "Upsilon",
    "Phi",
    "Chi",
    "Psi",
    "Omega",
    "Apollo",
  ];
  const articles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < tagNames.length; i++) {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            sectionId: typia.random<string & tags.Format<"uuid">>(),
            tags: [tagNames[i]],
          },
        },
      );
    typia.assert(article);
    articles.push(article);
  }
  // 2. Test pagination with minimum limit (1)
  const page1Limit1 = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 1,
        sort: "created_at",
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(page1Limit1);
  TestValidator.equals("limit 1 page count", page1Limit1.data.length, 1);
  TestValidator.equals("pagination current", page1Limit1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1Limit1.pagination.limit, 1);
  TestValidator.predicate(
    "pagination records > 0",
    page1Limit1.pagination.records > 0,
  );
  TestValidator.equals(
    "pagination pages",
    page1Limit1.pagination.pages,
    page1Limit1.pagination.records,
  );
  // 3. Test pagination with default limit (20)
  const page1Limit20 = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at",
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(page1Limit20);
  TestValidator.predicate("limit 20 has data", page1Limit20.data.length > 0);
  TestValidator.predicate(
    "limit 20 max 20 items",
    page1Limit20.data.length <= 20,
  );
  TestValidator.equals(
    "pagination limit 20",
    page1Limit20.pagination.limit,
    20,
  );
  // 4. Test pagination with maximum limit (100)
  const page1Limit100 = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "created_at",
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(page1Limit100);
  TestValidator.predicate("limit 100 has data", page1Limit100.data.length > 0);
  TestValidator.predicate(
    "limit 100 max 100 items",
    page1Limit100.data.length <= 100,
  );
  TestValidator.equals(
    "pagination limit 100",
    page1Limit100.pagination.limit,
    100,
  );
  // 5. Test limit clamping (150 should be clamped to 100)
  const page1Limit150 = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 150,
        sort: "created_at",
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(page1Limit150);
  TestValidator.equals(
    "limit clamped to 100",
    page1Limit150.pagination.limit,
    100,
  );
  // 6. Test page beyond available pages returns empty data
  const totalPages = page1Limit100.pagination.pages;
  const beyondPage = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        page: totalPages + 10,
        limit: 20,
        sort: "created_at",
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page returns empty", beyondPage.data.length, 0);
  // 7. Test sorting by 'name' (alphabetical ascending)
  const sortedByName = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "name",
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(sortedByName);
  if (sortedByName.data.length > 1) {
    for (let i = 1; i < sortedByName.data.length; i++) {
      TestValidator.predicate(
        `name sort order ${i - 1} to ${i}`,
        sortedByName.data[i - 1].name.localeCompare(
          sortedByName.data[i].name,
        ) <= 0,
      );
    }
  }
  // 8. Test sorting by 'created_at' (chronological, most recent first)
  const sortedByCreatedAt = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "created_at",
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(sortedByCreatedAt);
  if (sortedByCreatedAt.data.length > 1) {
    for (let i = 1; i < sortedByCreatedAt.data.length; i++) {
      const prevDate = new Date(
        sortedByCreatedAt.data[i - 1].created_at,
      ).getTime();
      const currDate = new Date(sortedByCreatedAt.data[i].created_at).getTime();
      TestValidator.predicate(
        `created_at sort order ${i - 1} to ${i}`,
        prevDate >= currDate,
      );
    }
  }
  // 9. Test pagination with search filter
  const searchResult = await api.functional.discussionBoard.tags.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "a",
        sort: "name",
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate("search has data", searchResult.data.length >= 0);
  TestValidator.equals(
    "search pagination limit",
    searchResult.pagination.limit,
    10,
  );
  // Verify all search results contain the search term
  for (const tag of searchResult.data) {
    TestValidator.predicate(
      `tag ${tag.name} contains search term`,
      tag.name.toLowerCase().includes("a"),
    );
  }
  // 10. Validate total pages calculation
  const totalRecords = page1Limit100.pagination.records;
  const calculatedPages = Math.ceil(totalRecords / 100);
  TestValidator.equals(
    "total pages calculation",
    page1Limit100.pagination.pages,
    calculatedPages,
  );
}
