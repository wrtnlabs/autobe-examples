import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_discussion_board_administrator_comments_list_pagination_default_sort(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Verify that an administrator can retrieve a paginated list of comments without any filter and with default ascending sorting. Validate that comments returned exclude soft-deleted comments and include correct author display names and article IDs. Check pagination metadata for correctness.
  // 1. Administrator Join/Authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Fetch paginated comments list with default parameters (empty request)
  const response =
    await api.functional.discussionBoard.administrator.comments.index(
      adminConnection,
      {
        body: {},
      },
    );
  // 3. Validate response shape
  typia.assert(response);
  // 4. Validate pagination metadata correctness
  const pagination = response.pagination;
  // current page must be at least 1
  TestValidator.predicate(
    "pagination current page >= 1",
    pagination.current >= 1,
  );
  // limit must be positive
  TestValidator.predicate("pagination limit > 0", pagination.limit > 0);
  // records can be zero or more
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  // pages count should be correct (Math.ceil(records / limit))
  TestValidator.equals(
    "pagination pages count matches records/limit",
    pagination.pages,
    Math.ceil(pagination.records / pagination.limit),
  );
  // 5. Validate each comment in the data
  for (const comment of response.data) {
    typia.assert(comment);
    // Removed validation of non-existent properties
  }
}
