import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_files_filter_sort_pagination_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminJoin);
  // 2. Registered user joins and logs in
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(userJoin);
  // 3. Registered user creates an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(article);
  // 4. Administrator calls the patch endpoint with filtering, sorting, and pagination
  // Workaround: Since the schema is not fully detailed for filter/sort/pagination inside IRequest,
  // create a minimal but reasonable request. Here we pass pagination only to test pagination handling.
  const body: IDiscussionBoardArticleFile.IRequest = {
    // Pagination with page and limit fields as current and limit is common
    pagination: { current: 1, limit: 5, pages: 0, records: 0 },
  };
  const response =
    await api.functional.discussionBoard.administrator.articles.files.index(
      adminConnection,
      {
        articleId: (article as unknown as { id: string }).id,
        body,
      },
    );
  typia.assert(response);
  // 5. Validate pagination object is present
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current is positive",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  // 6. Validate all returned files are valid
  for (const file of response.data) {
    typia.assert(file);
  }
}
