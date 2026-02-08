import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_requests_list_filter_by_status_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Authenticate as an administrator, then test the administrator requests list API
  // 1. Administrator joins to get authorized
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Call the administratorRequests.index endpoint with empty body (no filters supported by schema)
  const response =
    await api.functional.discussionBoard.administrator.administratorRequests.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(response);
  // 3. Check pagination properties exist and are reasonable
  TestValidator.predicate(
    "pagination current page positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Unauthorized user call should result in an error
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.discussionBoard.administrator.administratorRequests.index(
      unauthorizedConnection,
      { body: {} },
    );
  });
}
