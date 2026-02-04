import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import type { IEconPoliticBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdminRequest";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_requests_list_with_status_filter(
  connection: api.IConnection,
) {
  // 1. Create admin connection and authenticate using join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IEconPoliticBoardAdmin.IJoin,
  });
  // 2. Retrieve approved admin requests
  const response = await api.functional.econPoliticBoard.admin.requests.index(
    adminConnection,
    {
      body: {
        status: "approved",
      } satisfies IEconPoliticBoardAdminRequest.IRequest,
    },
  );
  // 3. Validate response structure
  typia.assert(response);
  // 4. Verify at least one approved request exists
  TestValidator.predicate(
    "should have approved requests",
    response.data.length > 0,
  );
  // 5. Verify request details for first item
  if (response.data.length > 0) {
    const firstRequest = response.data[0];
    TestValidator.equals(
      "request status matches",
      firstRequest.status,
      "approved",
    );
    TestValidator.equals("request has user identity", firstRequest.user, {
      id: firstRequest.user.id,
      name: firstRequest.user.name,
    });
    TestValidator.predicate(
      "request reason is non-empty",
      firstRequest.request_reason.length > 0,
    );
    TestValidator.equals(
      "created_at format is ISO 8601",
      firstRequest.created_at,
      new Date(firstRequest.created_at).toISOString(),
    );
  }
}
