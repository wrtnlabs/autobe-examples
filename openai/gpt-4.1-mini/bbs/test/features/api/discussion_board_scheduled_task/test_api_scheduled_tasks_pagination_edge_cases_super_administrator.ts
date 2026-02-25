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

export async function test_api_scheduled_tasks_pagination_edge_cases_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator by join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SuperSecurePass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  superAdminConnection.headers = {
    Authorization: superAdminAuthorized.token.access,
  };
  // Helper function to call the scheduledTasks.index endpoint
  async function callScheduledTasksIndex(
    body: IDiscussionBoardScheduledTask.IRequest,
  ) {
    const response =
      await api.functional.discussionBoard.superAdministrator.scheduledTasks.index(
        superAdminConnection,
        { body },
      );
    typia.assert(response);
    return response;
  }
  // 2. Test with page=0 (invalid, below minimum of 1), limit=1 (valid)
  await TestValidator.httpError(
    "page=0 should cause error or be normalized",
    [400, 422],
    async () => {
      await callScheduledTasksIndex({ page: 0, limit: 1 });
    },
  );
  // 3. Test with page=1 (valid), limit=101 (exceed max 100)
  await TestValidator.httpError(
    "limit=101 should cause error or be capped",
    [400, 422],
    async () => {
      await callScheduledTasksIndex({ page: 1, limit: 101 });
    },
  );
  // 4. Test with page=0 and limit=101 (both invalid)
  await TestValidator.httpError(
    "page=0 and limit=101 should cause error or be normalized",
    [400, 422],
    async () => {
      await callScheduledTasksIndex({ page: 0, limit: 101 });
    },
  );
  // 5. Test with page and limit undefined - defaults to valid behavior
  {
    const response = await callScheduledTasksIndex({});
    typia.assert(response);
    TestValidator.predicate(
      "default pagination page >= 1",
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "default pagination limit <= 100",
      response.pagination.limit <= 100,
    );
  }
  // 6. Test with page=null and limit=null - defaults to valid behavior
  {
    const response = await callScheduledTasksIndex({ page: null, limit: null });
    typia.assert(response);
    TestValidator.predicate(
      "null pagination page treated as default",
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "null pagination limit treated as default",
      response.pagination.limit <= 100,
    );
  }
}
