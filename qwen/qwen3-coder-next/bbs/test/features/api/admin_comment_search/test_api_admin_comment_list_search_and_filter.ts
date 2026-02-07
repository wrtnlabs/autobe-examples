import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_comment_list_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Create test article with comments for search testing
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const keyword = RandomGenerator.paragraph({ sentences: 1 });
  // Test search functionality with keyword
  const searchResult =
    await api.functional.discussionBoard.admin.articles.comments.index(
      adminConnection,
      {
        articleId: articleId,
        body: typia.random<IDiscussionBoardArticleComment.IRequest>(),
      },
    );
  typia.assert(searchResult);
  // Validate search results structure
  TestValidator.equals("pagination exists", !!searchResult.pagination, true);
  TestValidator.predicate("has data array", Array.isArray(searchResult.data));
  // Validate pagination metadata
  TestValidator.predicate(
    "current page positive",
    searchResult.pagination.current > 0,
  );
  TestValidator.predicate("limit positive", searchResult.pagination.limit > 0);
  TestValidator.predicate(
    "records non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate result count matches pagination
  TestValidator.predicate(
    "result count within limit",
    searchResult.data.length <= searchResult.pagination.limit,
  );
  TestValidator.predicate(
    "result count matches total records",
    searchResult.data.length <= searchResult.pagination.records,
  );
  // Test empty search results scenario
  const emptyKeyword = "nonexistentkeyword";
  const emptySearchResult =
    await api.functional.discussionBoard.admin.articles.comments.index(
      adminConnection,
      {
        articleId: articleId,
        body: typia.random<IDiscussionBoardArticleComment.IRequest>(),
      },
    );
  typia.assert(emptySearchResult);
  // Validate empty search pagination
  TestValidator.equals(
    "empty search total records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search results array",
    emptySearchResult.data.length,
    0,
  );
}
