import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
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

export async function test_api_super_administrator_administrator_requests_pending_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Administrator joins (registers and authenticates)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(authorized);
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2. Call the pending administrator requests list endpoint
  const output =
    await api.functional.discussionBoard.superAdministrator.administratorRequests.pending.index(
      superAdminConnection,
    );
  // 3. Validate the response shape
  typia.assert(output);
  // 4. Ensure data list is empty
  TestValidator.equals(
    "empty pending administrator requests list",
    output.data,
    [],
  );
  // 5. Validate pagination metadata indicating empty list
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive or zero",
    output.pagination.limit >= 0,
  );
  TestValidator.equals("pagination records", output.pagination.records, 0);
  TestValidator.equals("pagination pages", output.pagination.pages, 0);
}
