import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorSession";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that a super administrator can retrieve all administrator session records
 * across the platform with proper filtering and pagination.
 */
export async function test_api_administrator_request_list_super_admin_all_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Retrieve all administrator session records (no status filter)
  const allSessions =
    await api.functional.shoppingMall.administrator.requests.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallAdministratorSession.IRequest,
      },
    );
  typia.assert(allSessions);
  // 3. Validate pagination metadata exists
  TestValidator.predicate("has pagination", allSessions.pagination !== null);
  TestValidator.predicate("has data array", Array.isArray(allSessions.data));
  TestValidator.predicate(
    "current page is valid",
    allSessions.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", allSessions.pagination.limit >= 0);
  TestValidator.predicate(
    "records count is valid",
    allSessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    allSessions.pagination.pages >= 0,
  );
  // 4. Validate session structure if sessions exist
  if (allSessions.data.length > 0) {
    const session = allSessions.data[0];
    TestValidator.predicate("session has id", !!session.id);
    TestValidator.predicate(
      "session has administrator",
      !!session.administrator,
    );
    TestValidator.predicate("session has ip", typeof session.ip === "string");
    TestValidator.predicate(
      "session has href",
      typeof session.href === "string",
    );
    TestValidator.predicate("session has created_at", !!session.created_at);
    TestValidator.predicate("session has expired_at", !!session.expired_at);
  }
  // 5. Test pagination with explicit parameters
  const paginatedResult =
    await api.functional.shoppingMall.administrator.requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdministratorSession.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit applied",
    paginatedResult.pagination.limit === 10,
  );
  // 6. Test status filtering - pending
  const pendingSessions =
    await api.functional.shoppingMall.administrator.requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallAdministratorSession.IRequest,
      },
    );
  typia.assert(pendingSessions);
  // 7. Test status filtering - approved
  const approvedSessions =
    await api.functional.shoppingMall.administrator.requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallAdministratorSession.IRequest,
      },
    );
  typia.assert(approvedSessions);
  // 8. Test status filtering - rejected
  const rejectedSessions =
    await api.functional.shoppingMall.administrator.requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallAdministratorSession.IRequest,
      },
    );
  typia.assert(rejectedSessions);
  // 9. Test pagination with different limit
  const smallPageResult =
    await api.functional.shoppingMall.administrator.requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallAdministratorSession.IRequest,
      },
    );
  typia.assert(smallPageResult);
  TestValidator.predicate(
    "small page limit applied",
    smallPageResult.pagination.limit === 5,
  );
}
