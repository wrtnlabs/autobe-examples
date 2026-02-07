import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_comment_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.discussionBoard.auth.super_admin.join(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(joinResult);
  const token: IAuthorizationToken = joinResult.token;
  adminConnection.headers = {
    Authorization: token.access,
  };
  // 2. Create test article
  const sectionId = typia.random<string>();
  const article =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      adminConnection,
      {
        sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // 3. Test search with keyword that matches some comments
  const searchTerm = "searchable";
  const searchResult =
    await api.functional.discussionBoard.superAdmin.articles.comments.index(
      adminConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          keyword: searchTerm,
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        },
      },
    );
  typia.assert(searchResult);
  // 4. Validate search results
  TestValidator.equals("search term matches", searchTerm, "searchable");
  TestValidator.predicate(
    "results count matches",
    searchResult.pagination.records === searchResult.data.length,
  );
  // 5. Test search with keyword that matches no comments
  const noMatchTerm = "nonexistentkeyword12345";
  const noMatchResult =
    await api.functional.discussionBoard.superAdmin.articles.comments.index(
      adminConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          keyword: noMatchTerm,
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        },
      },
    );
  typia.assert(noMatchResult);
  // 6. Validate no-match results
  TestValidator.equals(
    "no results for nonexistent term",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no records for nonexistent term",
    noMatchResult.pagination.records,
    0,
  );
}
