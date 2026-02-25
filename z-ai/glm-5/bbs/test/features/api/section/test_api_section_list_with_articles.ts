import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_sections_create } from "../../../generate/generate_random_discussion_board_user_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test the section list endpoint with actual sections containing varying article counts.
 *
 * Setup: Create a user, then create 3 sections with different names
 * ('Economy', 'Politics', 'Technology') and descriptions. Create articles in some
 * sections (2 articles in 'Economy', 0 in 'Politics', 1 in 'Technology').
 *
 * Verification:
 * - All sections appear in the response with correct article counts
 * - Sections are sorted alphabetically by name case-insensitively
 * - Each section includes correct id, name, description, articles_count, and creator summary
 * - Pagination metadata reflects total count
 * - The creator field contains valid IDiscussionBoardUser.ISummary
 * - Test pagination by requesting limit=2 and verifying only 2 sections are returned
 */
export async function test_api_section_list_with_articles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user account
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  // 2. Create 3 sections
  const economySection =
    await generate_random_discussion_board_user_sections_create(
      userConnection,
      {
        body: {
          name: "Economy",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(economySection);
  const politicsSection =
    await generate_random_discussion_board_user_sections_create(
      userConnection,
      {
        body: {
          name: "Politics",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(politicsSection);
  const technologySection =
    await generate_random_discussion_board_user_sections_create(
      userConnection,
      {
        body: {
          name: "Technology",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(technologySection);
  // 3. Create articles in sections
  // 2 articles in Economy
  await generate_random_discussion_board_user_articles_create(userConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      content: RandomGenerator.content({ paragraphs: 2 }),
      sectionId: economySection.id,
    },
  });
  await generate_random_discussion_board_user_articles_create(userConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      content: RandomGenerator.content({ paragraphs: 2 }),
      sectionId: economySection.id,
    },
  });
  // 0 articles in Politics - skip
  // 1 article in Technology
  await generate_random_discussion_board_user_articles_create(userConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      content: RandomGenerator.content({ paragraphs: 2 }),
      sectionId: technologySection.id,
    },
  });
  // 4. Call section list endpoint
  const sectionList = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(sectionList);
  // 5. Verify all sections appear with correct article counts
  TestValidator.equals("total records", sectionList.pagination.records, 3);
  TestValidator.equals("total pages", sectionList.pagination.pages, 1);
  // Find each section in the response
  const economySummary = sectionList.data.find((s) => s.name === "Economy");
  const politicsSummary = sectionList.data.find((s) => s.name === "Politics");
  const technologySummary = sectionList.data.find(
    (s) => s.name === "Technology",
  );
  TestValidator.predicate(
    "Economy section exists",
    economySummary !== undefined,
  );
  TestValidator.predicate(
    "Politics section exists",
    politicsSummary !== undefined,
  );
  TestValidator.predicate(
    "Technology section exists",
    technologySummary !== undefined,
  );
  // Verify article counts
  TestValidator.equals(
    "Economy article count",
    economySummary!.articles_count,
    2,
  );
  TestValidator.equals(
    "Politics article count",
    politicsSummary!.articles_count,
    0,
  );
  TestValidator.equals(
    "Technology article count",
    technologySummary!.articles_count,
    1,
  );
  // 6. Verify sections are sorted alphabetically by name (case-insensitive)
  const sortedNames = [...sectionList.data].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );
  TestValidator.equals(
    "sections sorted alphabetically",
    sectionList.data.map((s) => s.name),
    sortedNames.map((s) => s.name),
  );
  // 7. Verify each section has correct fields
  for (const section of sectionList.data) {
    typia.assert(section);
    typia.assert(section.creator);
  }
  // 8. Test pagination with limit=2
  const paginatedList = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        limit: 2,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(paginatedList);
  TestValidator.equals("paginated limit", paginatedList.pagination.limit, 2);
  TestValidator.equals(
    "paginated records",
    paginatedList.pagination.records,
    3,
  );
  TestValidator.equals(
    "paginated current page",
    paginatedList.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated total pages",
    paginatedList.pagination.pages,
    2,
  );
  TestValidator.equals("paginated data length", paginatedList.data.length, 2);
}
