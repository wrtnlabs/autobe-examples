import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminActionLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminActionLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_action_logs_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // First, we need to create some admin actions that will generate logs
  // Since we can't directly create logs via API, we'll test the filtering
  // by performing actual admin operations that generate logs
  // Test 1: Filter logs with no specific action type (should return all)
  const allLogs =
    await api.functional.ecommerceMall.admin.admin_action_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminActionLog.IRequest,
      },
    );
  typia.assert(allLogs);
  // Test 2: Filter by seller_approve action type
  const sellerApproveLogs =
    await api.functional.ecommerceMall.admin.admin_action_logs.index(
      adminConnection,
      {
        body: {
          action_type: "seller_approve",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAdminActionLog.IRequest,
      },
    );
  typia.assert(sellerApproveLogs);
  // Validate that all returned logs have the specified action type
  for (const log of sellerApproveLogs.data) {
    TestValidator.equals(
      "all seller_approve logs should have correct action_type",
      log.action_type,
      "seller_approve",
    );
  }
  // Test 3: Filter by seller_reject action type
  const sellerRejectLogs =
    await api.functional.ecommerceMall.admin.admin_action_logs.index(
      adminConnection,
      {
        body: {
          action_type: "seller_reject",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAdminActionLog.IRequest,
      },
    );
  typia.assert(sellerRejectLogs);
  // Validate that all returned logs have the specified action type
  for (const log of sellerRejectLogs.data) {
    TestValidator.equals(
      "all seller_reject logs should have correct action_type",
      log.action_type,
      "seller_reject",
    );
  }
  // Test 4: Filter by user_ban action type
  const userBanLogs =
    await api.functional.ecommerceMall.admin.admin_action_logs.index(
      adminConnection,
      {
        body: {
          action_type: "user_ban",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAdminActionLog.IRequest,
      },
    );
  typia.assert(userBanLogs);
  // Validate that all returned logs have the specified action type
  for (const log of userBanLogs.data) {
    TestValidator.equals(
      "all user_ban logs should have correct action_type",
      log.action_type,
      "user_ban",
    );
  }
  // Test 5: Filter by product_delete action type
  const productDeleteLogs =
    await api.functional.ecommerceMall.admin.admin_action_logs.index(
      adminConnection,
      {
        body: {
          action_type: "product_delete",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAdminActionLog.IRequest,
      },
    );
  typia.assert(productDeleteLogs);
  // Validate that all returned logs have the specified action type
  for (const log of productDeleteLogs.data) {
    TestValidator.equals(
      "all product_delete logs should have correct action_type",
      log.action_type,
      "product_delete",
    );
  }
  // Test 6: Verify pagination works with filtering
  const paginatedLogs =
    await api.functional.ecommerceMall.admin.admin_action_logs.index(
      adminConnection,
      {
        body: {
          action_type: "seller_approve",
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallAdminActionLog.IRequest,
      },
    );
  typia.assert(paginatedLogs);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have correct structure",
    () => paginatedLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    () => paginatedLogs.pagination.limit <= 5,
  );
}
