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

export async function test_api_healthcheck_empty_list_with_unmatched_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator by joining with valid credentials
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {}, // Empty IJoin body since no fields are given
  });
  typia.assert(adminAuth);
  // Set authorization token header for adminConnection
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Send a PATCH request with filters that are unlikely to return any record
  const body: IDiscussionBoardHealthCheck.IRequest = {
    status: "ERROR",
    checked_at_from: "2030-01-01T00:00:00.000Z",
    checked_at_to: "2030-01-02T00:00:00.000Z",
    details: "nonexistenterror",
  };
  const result =
    await api.functional.discussionBoard.administrator.healthChecks.index(
      adminConnection,
      { body },
    );
  typia.assert(result);
  // 4. Confirm the data array is empty
  TestValidator.equals("response data array length", result.data.length, 0);
  // 5. Confirm pagination metadata shows zero records and zero pages
  TestValidator.equals("pagination.records", result.pagination.records, 0);
  TestValidator.equals("pagination.pages", result.pagination.pages, 0);
  // 6. Access control check: trying to call without authorization should fail
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access", [401, 403], async () => {
    await api.functional.discussionBoard.administrator.healthChecks.index(
      guestConnection,
      {
        body: {},
      },
    );
  });
}
