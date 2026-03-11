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

export async function test_api_article_section_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - Create two sections
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  const politicsSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Politics",
          description: "Political discussions and debates",
        },
      },
    );
  typia.assert(politicsSection);
  const economySection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Economy",
          description: "Economic discussions and analysis",
        },
      },
    );
  typia.assert(economySection);
  // 2. Member setup - Register and login
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
    },
  });
  typia.assert(memberAuth);
  // 3. Create 5 articles in Politics section
  const politicsArticles = await ArrayUtil.asyncRepeat(5, async () => {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            sectionId: politicsSection.id,
          },
        },
      );
    typia.assert(article);
    return article;
  });
  // 4. Create 5 articles in Economy section
  const economyArticles = await ArrayUtil.asyncRepeat(5, async () => {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            sectionId: economySection.id,
          },
        },
      );
    typia.assert(article);
    return article;
  });
  // 5. Test filtering by Politics section
  const politicsFilterResult =
    await api.functional.discussionBoard.articles.index(memberConnection, {
      body: {
        section_id: politicsSection.id,
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(politicsFilterResult);
  // Verify only Politics articles are returned
  TestValidator.equals(
    "Politics section article count",
    politicsFilterResult.data.length,
    5,
  );
  TestValidator.equals(
    "Total records matches Politics articles",
    politicsFilterResult.pagination.records,
    5,
  );
  // Verify all returned articles belong to Politics section
  for (const article of politicsFilterResult.data) {
    TestValidator.predicate(
      `Article ${article.id} belongs to Politics section`,
      politicsArticles.some((pa) => pa.id === article.id),
    );
  }
  // 6. Test filtering by Economy section
  const economyFilterResult =
    await api.functional.discussionBoard.articles.index(memberConnection, {
      body: {
        section_id: economySection.id,
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(economyFilterResult);
  // Verify only Economy articles are returned
  TestValidator.equals(
    "Economy section article count",
    economyFilterResult.data.length,
    5,
  );
  TestValidator.equals(
    "Total records matches Economy articles",
    economyFilterResult.pagination.records,
    5,
  );
  // 7. Test with non-existent section_id - should return empty result
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  const emptyFilterResult = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        section_id: nonExistentSectionId,
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptyFilterResult);
  TestValidator.equals(
    "Non-existent section returns empty data",
    emptyFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "Non-existent section returns zero records",
    emptyFilterResult.pagination.records,
    0,
  );
  // 8. Test pagination with section filter
  const paginatedResult = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        section_id: politicsSection.id,
        sort: "newest",
        page: 1,
        limit: 3,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "Paginated Politics articles count",
    paginatedResult.data.length,
    3,
  );
  TestValidator.equals(
    "Total records still matches all Politics articles",
    paginatedResult.pagination.records,
    5,
  );
  TestValidator.equals(
    "Total pages calculated correctly",
    paginatedResult.pagination.pages,
    2,
  );
  TestValidator.equals(
    "Current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("Limit is 3", paginatedResult.pagination.limit, 3);
  // Verify paginated articles belong to Politics section
  for (const article of paginatedResult.data) {
    TestValidator.predicate(
      `Paginated article ${article.id} belongs to Politics section`,
      politicsArticles.some((pa) => pa.id === article.id),
    );
  }
}
