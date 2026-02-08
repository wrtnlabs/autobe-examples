import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardHealthCheck";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_healthcheck_filtered_list_with_status_and_date_range_and_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Prepare filter request
  const filterBody = {
    status: "OK",
    checked_at: {
      from: "2026-01-01T00:00:00Z",
      to: "2026-01-31T23:59:59Z",
    },
    details: "CPU",
    page: {
      current: 1,
      limit: 10,
    },
  };
  // 3. Invoke filtered healthChecks index API
  const response =
    await api.functional.discussionBoard.administrator.healthChecks.index(
      adminConnection,
      { body: filterBody },
    );
  // Assert response structure
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    filterBody.page.current,
  );
  TestValidator.equals(
    "pagination limit",
    response.pagination.limit,
    filterBody.page.limit,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  // 5. Validate unauthorized access
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.discussionBoard.administrator.healthChecks.index(
      unauthConnection,
      { body: filterBody },
    );
  });
}
