import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityServiceStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityServiceStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityServiceStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityServiceStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_service_status_cursor_pagination_successive_pages(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to access monitoring endpoints
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Call endpoint with empty request body as IRequest is {} (no properties allowed)
  const response = await api.functional.community.admin.service_statuses.index(
    adminConnection,
    {
      body: {} satisfies ICommunityServiceStatus.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response has valid pagination metadata and at least one record
  TestValidator.predicate(
    "pagination has records",
    () => response.pagination.records > 0,
  );
  TestValidator.equals(
    "pagination limit is non-zero",
    response.pagination.limit,
    10,
  ); // Default is 10 according to IPage.IPagination
  TestValidator.predicate(
    "data array exists and is non-empty",
    () => response.data.length > 0,
  );
  // Cursor-based pagination cannot be tested because IRequest is {} and does not accept cursor parameters.
}
