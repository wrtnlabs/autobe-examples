import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    },
  );
  typia.assert(joinResponse);
  // Step 2: Retrieve audit logs with default pagination
  const logs =
    await api.functional.discussionBoard.admin.logs.index(adminConnection);
  typia.assert(logs);
  // Step 3: Validate response structure
  TestValidator.equals("pagination exists", logs.pagination, {
    current: logs.pagination.current,
    limit: logs.pagination.limit,
    records: logs.pagination.records,
    pages: logs.pagination.pages,
  });
  TestValidator.predicate("has data array", Array.isArray(logs.data));
  TestValidator.predicate(
    "data count matches records",
    logs.data.length <= logs.pagination.records,
  );
  // Step 4: Validate pagination metadata structure
  TestValidator.predicate(
    "current page is positive",
    logs.pagination.current > 0,
  );
  TestValidator.predicate("limit is positive", logs.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    logs.pagination.records >= 0,
  );
  TestValidator.predicate("pages is non-negative", logs.pagination.pages >= 0);
}
