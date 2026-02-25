import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_admin_articles_search_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create test sections
  const section1 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  const section2 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  // 3. Create multiple test articles with varied attributes
  const articles = await ArrayUtil.asyncRepeat(5, async (index) => {
    const article =
      await generate_random_discussion_board_admin_articles_create(
        adminConnection,
        {
          body: {
            title: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 5,
              wordMax: 10,
            }),
            content: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 10,
              wordMax: 20,
            }),
            discussion_board_section_id:
              index % 2 === 0 ? section1.id : section2.id,
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    return article;
  });
  // 4. Test comprehensive filtering with various criteria
  const searchResults =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        discussion_board_section_id: section1.id,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResults);
  // 5. Validate pagination structure
  TestValidator.predicate(
    "pagination structure valid",
    searchResults.pagination !== null,
  );
  TestValidator.predicate("has data array", Array.isArray(searchResults.data));
  // 6. Test text search functionality
  const searchText = RandomGenerator.substring(articles[0].title);
  const textSearchResults =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        title: searchText,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(textSearchResults);
  // 7. Test date range filtering
  const dateSearchResults =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        created_at_start: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        created_at_end: new Date().toISOString(),
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(dateSearchResults);
  // 8. Test empty result set with impossible criteria
  const emptySearchResults =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptySearchResults);
  TestValidator.equals("empty result set", emptySearchResults.data.length, 0);
  // 9. Test maximum limit validation
  const maxLimitResults =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        limit: 100,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(maxLimitResults);
  TestValidator.predicate(
    "limit respects maximum",
    maxLimitResults.data.length <= 100,
  );
}