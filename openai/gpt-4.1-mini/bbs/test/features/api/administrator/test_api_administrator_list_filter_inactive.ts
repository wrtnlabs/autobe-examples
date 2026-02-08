import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_list_filter_inactive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and setup for authentication
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {},
    },
  );
  administratorConnection.headers = { Authorization: authorized.token.access };
  // 2. Request list of administrators filtered by active:false to retrieve inactive administrators
  // Note: The provided IDiscussionBoardAdministrator.IRequest DTO is empty, so filtering by active status cannot be specified
  // Sending empty object as the request body due to lack of schema properties
  const requestBody: IDiscussionBoardAdministrator.IRequest = {};
  const response =
    await api.functional.discussionBoard.administrator.administrators.index(
      administratorConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 3. Validate the pagination info
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages matches records and limit",
    pagination.pages ===
      (pagination.records === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit)),
  );
  // 4. Validate entries in list
  for (const admin of response.data) {
    typia.assert(admin);
    // No 'active' property in ISummary; can't validate active status explicitly
  }
}
