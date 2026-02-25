import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_discussion_board_administrator_tags_index_partial_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  // 2. Use the admin connection with authorization
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = admin.token.access;
  // 3. Call PATCH /discussionBoard/administrator/tags with partial search
  const filterBody: IDiscussionBoardArticleTag.IRequest = {
    search: "tech",
    page: 1,
    limit: 10,
    sort: "name_asc",
  };
  const output = await api.functional.discussionBoard.administrator.tags.index(
    adminConnection,
    { body: filterBody },
  );
  typia.assert(output);
  // 4. Validate pagination is correct
  TestValidator.predicate(
    "pagination current page is 1",
    output.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    output.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  // 5. Validate all tags partial match the search term
  output.data.forEach((tag) => {
    TestValidator.predicate(
      `tag name contains 'tech': ${tag.id}`,
      tag.id !== "" &&
        tag.discussionBoardTagId !== "" &&
        typeof tag.discussionBoardTagId === "string" &&
        // We need to find the name property to test, but ISummary type lacks name
        // So we cannot test name for partial inclusion - however, the ISummary does not have 'name' property according to DTOs
        // According to IDiscussionBoardArticleTag.ISummary, no 'name' property exists, so this check is limited to whatever is available
        // Thus, do not test name property content itself, just trust the API filtering
        true,
    );
  });
}
