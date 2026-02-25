import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_images_admin_comprehensive_filter_combinations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create an article for testing
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Test Scenario 1: Filter by single status value only
  const filter1 =
    await api.functional.discussionBoard.admin.articles.images.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(filter1);
  TestValidator.equals(
    "scenario 1 returns paginated results",
    typeof filter1.pagination.records,
    "number",
  );
  // 4. Test Scenario 2: Filter by display_order range
  const filter2 =
    await api.functional.discussionBoard.admin.articles.images.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(filter2);
  TestValidator.predicate(
    "scenario 2 has valid pagination",
    filter2.pagination.records >= 0,
  );
  // 5. Test Scenario 3: Combine alt_text and caption searches
  const filter3 =
    await api.functional.discussionBoard.admin.articles.images.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          alt_text: RandomGenerator.substring("image description test"),
          caption: RandomGenerator.substring("test caption"),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(filter3);
  TestValidator.equals(
    "scenario 3 pagination is valid",
    typeof filter3.pagination.pages,
    "number",
  );
  // 6. Test Scenario 4: Use null values for optional filters
  const filter4 =
    await api.functional.discussionBoard.admin.articles.images.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          status: null,
          display_order: null,
          alt_text: null,
          caption: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(filter4);
  TestValidator.predicate(
    "scenario 4 handles null filters correctly",
    filter4.pagination.limit === 10,
  );
  // 7. Validate all scenarios returned valid pagination structures
  TestValidator.predicate(
    "all scenarios returned valid data arrays",
    Array.isArray(filter1.data) &&
      Array.isArray(filter2.data) &&
      Array.isArray(filter3.data) &&
      Array.isArray(filter4.data),
  );
}
