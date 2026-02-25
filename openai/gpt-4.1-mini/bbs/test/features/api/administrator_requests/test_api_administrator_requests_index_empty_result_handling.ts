import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_requests_index_empty_result_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(auth);
  superAdminConnection.headers = { Authorization: auth.token.access };
  // 2. Define a filter that is expected to yield no results (e.g. status:'nonexistent-status')
  const body: IDiscussionBoardAdministratorRequest.IRequest = {
    status: `nonexistent-status`,
    page: 1,
    limit: 10,
  };
  // 3. Call the index endpoint with the filter
  const output =
    await api.functional.discussionBoard.superAdministrator.administrator.requests.index(
      superAdminConnection,
      { body },
    );
  // 4. Assert response shape
  typia.assert(output);
  // 5. Assert the data array is empty
  TestValidator.equals("empty data array", output.data.length, 0);
  // 6. Assert pagination information is correct for empty result
  TestValidator.predicate(
    "pagination current page is 1",
    output.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination pages is 0",
    output.pagination.pages === 0,
  );
  TestValidator.predicate(
    "pagination records is 0",
    output.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    output.pagination.limit === 10,
  );
}
