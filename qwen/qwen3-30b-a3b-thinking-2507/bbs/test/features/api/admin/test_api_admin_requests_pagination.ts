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

export async function test_api_admin_requests_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Generate test data for pagination testing (30 requests total)
  const totalRequests = 30;
  const defaultLimit = 15;
  const defaultTotalPages = Math.ceil(totalRequests / defaultLimit);
  // 3. Test default pagination (page=1, limit=15)
  const defaultPagination =
    await api.functional.econPoliticBoard.admin.requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: defaultLimit,
        } satisfies IEconPoliticBoardAdminRequest.IRequest,
      },
    );
  typia.assert(defaultPagination);
  // 4. Test custom pagination (page=2, limit=10)
  const customLimit = 10;
  const customTotalPages = Math.ceil(totalRequests / customLimit);
  const customPagination =
    await api.functional.econPoliticBoard.admin.requests.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: customLimit,
        } satisfies IEconPoliticBoardAdminRequest.IRequest,
      },
    );
  typia.assert(customPagination);
  // 5. Validate default pagination metadata
  TestValidator.equals(
    "Default pagination should return correct current page",
    defaultPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "Default pagination should return correct limit",
    defaultPagination.pagination.limit,
    defaultLimit,
  );
  TestValidator.equals(
    "Default pagination should return correct records count",
    defaultPagination.pagination.records,
    totalRequests,
  );
  TestValidator.equals(
    "Default pagination should calculate correct total pages",
    defaultPagination.pagination.pages,
    defaultTotalPages,
  );
  // 6. Validate custom pagination metadata
  TestValidator.equals(
    "Custom pagination should return correct current page",
    customPagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "Custom pagination should return correct limit",
    customPagination.pagination.limit,
    customLimit,
  );
  TestValidator.equals(
    "Custom pagination should return correct records count",
    customPagination.pagination.records,
    totalRequests,
  );
  TestValidator.equals(
    "Custom pagination should calculate correct total pages",
    customPagination.pagination.pages,
    customTotalPages,
  );
  // 7. Validate correct number of records per page
  TestValidator.equals(
    "Default pagination should return default limit records",
    defaultPagination.data.length,
    defaultLimit,
  );
  TestValidator.equals(
    "Custom pagination should return custom limit records",
    customPagination.data.length,
    customLimit,
  );
}
