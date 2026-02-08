import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardScheduledTask";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardScheduledTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_scheduled_tasks_list_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator join and get authorized connection
  const superAdminJoinConnection: IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminJoinConnection,
    {
      body: {} satisfies IDiscussionBoardSuperAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const superAdminConnection: IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  // 2. Call the index API with empty body (since filter/pagination props do not exist in schema)
  const pageNumber = 1; // Normal page to check
  const pageLimit = 10; // Normal limit to check
  const output: IPageIDiscussionBoardScheduledTask.ISummary =
    await api.functional.discussionBoard.superAdministrator.scheduledTasks.index(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(output);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is number",
    typeof output.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof output.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof output.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof output.pagination.pages === "number",
  );
  // Validate that current and limit are sensible
  TestValidator.predicate(
    "pagination current page positive",
    output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    output.pagination.limit > 0,
  );
  // Validate data elements
  for (const item of output.data) {
    typia.assert(item);
  }
}
