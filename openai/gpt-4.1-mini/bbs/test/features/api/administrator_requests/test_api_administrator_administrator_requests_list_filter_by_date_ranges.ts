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

export async function test_api_administrator_administrator_requests_list_filter_by_date_ranges(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // 2. Prepare minimal body - no properties because IRequest is empty
  const body: IDiscussionBoardAdministratorRequest.IRequest = {};
  // 3. Call the administratorRequests index API to fetch list
  const output =
    await api.functional.discussionBoard.administrator.administratorRequests.index(
      adminConnection,
      { body },
    );
  // 4. Validate response structure
  typia.assert(output!);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is >= 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is >= 0",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    output.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages should be ceil(records / limit)",
    output.pagination.pages,
    Math.ceil(output.pagination.records / (output.pagination.limit || 1)),
  );
  // 6. Validate each item in data list
  for (const request of output.data) {
    typia.assert(request);
    // No known filtering properties; no date range checks
  }
}
