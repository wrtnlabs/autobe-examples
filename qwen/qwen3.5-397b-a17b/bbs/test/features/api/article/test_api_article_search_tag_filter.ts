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
 * Test article search and tag filtering functionality.
 *
 * This test validates the PATCH /discussionBoard/articles endpoint's search and tag filtering capabilities.
 * It creates multiple articles with different titles and tags, then tests various filter combinations
 * to ensure search uses case-insensitive matching, tag filtering uses OR logic, and combined filters
 * apply AND logic between different filter types.
 */
export async function test_api_article_search_tag_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
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
  typia.assert(adminAuth);
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
      } satisfies IDiscussionBoardSection.ICreate,
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
  // 3. Create 4 articles with different titles and tags
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Economic Policy Reform",
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
          tags: ["economy", "policy"],
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Political Debate Summary",
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
          tags: ["politics", "debate"],
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  const article3 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Economic Growth Analysis",
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
          tags: ["economy", "analysis"],
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article3);
  const article4 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Technology Innovation",
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: section.id,
          tags: ["technology", "innovation"],
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article4);
  // 4. Test search='Economic' (should match articles 1 and 3 by title)
  const searchEconomic = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        search: "Economic",
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchEconomic);
  TestValidator.predicate(
    "search 'Economic' returns 2 articles",
    () => searchEconomic.data.length === 2,
  );
  const searchEconomicIds = searchEconomic.data.map((a) => a.id);
  TestValidator.predicate("search includes article 1", () =>
    searchEconomicIds.includes(article1.id),
  );
  TestValidator.predicate("search includes article 3", () =>
    searchEconomicIds.includes(article3.id),
  );
  // 5. Test tags=['economy'] (should match articles 1 and 3)
  const tagsEconomy = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        tags: ["economy"],
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(tagsEconomy);
  TestValidator.predicate(
    "tags ['economy'] returns 2 articles",
    () => tagsEconomy.data.length === 2,
  );
  const tagsEconomyIds = tagsEconomy.data.map((a) => a.id);
  TestValidator.predicate("tags includes article 1", () =>
    tagsEconomyIds.includes(article1.id),
  );
  TestValidator.predicate("tags includes article 3", () =>
    tagsEconomyIds.includes(article3.id),
  );
  // 6. Test combined search='Economic' AND tags=['policy'] (should match only article 1)
  const combined = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        search: "Economic",
        tags: ["policy"],
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(combined);
  TestValidator.equals(
    "combined search and tags returns 1 article",
    combined.data.length,
    1,
  );
  TestValidator.equals(
    "combined result is article 1",
    combined.data[0].id,
    article1.id,
  );
  // 7. Test tags=['economy', 'technology'] with OR logic (should match articles 1, 3, 4)
  const tagsOr = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        tags: ["economy", "technology"],
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(tagsOr);
  TestValidator.predicate(
    "tags OR logic returns 3 articles",
    () => tagsOr.data.length === 3,
  );
  const tagsOrIds = tagsOr.data.map((a) => a.id);
  TestValidator.predicate("tags OR includes article 1 (economy)", () =>
    tagsOrIds.includes(article1.id),
  );
  TestValidator.predicate("tags OR includes article 3 (economy)", () =>
    tagsOrIds.includes(article3.id),
  );
  TestValidator.predicate("tags OR includes article 4 (technology)", () =>
    tagsOrIds.includes(article4.id),
  );
  // 8. Test empty search query (should return all 4 articles)
  const emptySearch = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns all 4 articles",
    () => emptySearch.data.length === 4,
  );
  // 9. Test sorting with sort='oldest' (articles ordered by created_at ASC)
  const sortedOldest = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        sort: "oldest",
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(sortedOldest);
  TestValidator.equals(
    "oldest sort returns 4 articles",
    sortedOldest.data.length,
    4,
  );
  // Verify ascending order by created_at
  for (let i = 1; i < sortedOldest.data.length; i++) {
    const prev = new Date(sortedOldest.data[i - 1].created_at).getTime();
    const curr = new Date(sortedOldest.data[i].created_at).getTime();
    TestValidator.predicate(
      `article ${i} created before article ${i + 1}`,
      () => prev <= curr,
    );
  }
}
