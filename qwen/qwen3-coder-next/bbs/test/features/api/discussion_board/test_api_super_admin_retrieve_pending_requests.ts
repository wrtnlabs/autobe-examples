import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRequest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminsRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_retrieve_pending_requests(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin account and get authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinResponse =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(joinResponse);
  // Call the endpoint to retrieve pending requests
  const response = await api.functional.discussionBoard.admin.requests.index(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardAdminsRequest.IRequest>(),
    },
  );
  typia.assert(response);
  // Validate response structure
  TestValidator.predicate(
    "has pagination",
    response.pagination !== null && response.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(response.data));
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    typeof response.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof response.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records",
    typeof response.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages",
    typeof response.pagination.pages,
    "number",
  );
  // Test empty results scenario
  TestValidator.predicate(
    "data array exists even when empty",
    Array.isArray(response.data),
  );
  // Validate request summaries structure when data exists
  if (response.data.length > 0) {
    TestValidator.equals(
      "first request has expected fields",
      typeof response.data[0],
      "object",
    );
  }
}
