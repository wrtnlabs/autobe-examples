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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_popular_articles_engagement_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test basic pagination functionality
  const defaultPage =
    await api.functional.discussionBoard.superAdmin.popular.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", defaultPage.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    defaultPage.pagination.pages >= 0,
  );
  // Validate article summary structure for each article
  for (const article of defaultPage.data) {
    typia.assert(article);
    TestValidator.predicate("article has title", article.title.length > 0);
    typia.assert(article.author);
    TestValidator.predicate(
      "author has display name",
      article.author.display_name.length > 0,
    );
    typia.assert(article.section);
    TestValidator.predicate(
      "section has name",
      article.section.name.length > 0,
    );
    typia.assert(article.tags);
    TestValidator.predicate(
      "comments count non-negative",
      article.comments_count >= 0,
    );
  }
  // Test different page sizes to validate pagination scaling
  const smallPage =
    await api.functional.discussionBoard.superAdmin.popular.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(smallPage);
  TestValidator.equals("small page limit", smallPage.pagination.limit, 5);
  const largePage =
    await api.functional.discussionBoard.superAdmin.popular.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(largePage);
  TestValidator.equals("large page limit", largePage.pagination.limit, 20);
  // Test search functionality
  const searchTest =
    await api.functional.discussionBoard.superAdmin.popular.index(
      superAdminConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchTest);
  // Test section filtering
  const sectionFilterTest =
    await api.functional.discussionBoard.superAdmin.popular.index(
      superAdminConnection,
      {
        body: {
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(sectionFilterTest);
  // Test pagination boundaries with high page number
  const highPage =
    await api.functional.discussionBoard.superAdmin.popular.index(
      superAdminConnection,
      {
        body: {
          page: 100,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(highPage);
  TestValidator.predicate(
    "high page returns valid data array",
    Array.isArray(highPage.data),
  );
}
