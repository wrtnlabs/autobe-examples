import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering administrator audit logs by action type and entity type.
 *
 * Validates the complete audit log filtering workflow including super administrator authentication, action type filtering, target entity type filtering, and combined filter validation. Ensures that filtered results accurately match the specified criteria and that pagination metadata remains correct.
 *
 * Special attention is given to verifying that action_type and target_entity_type filters work independently and in combination, returning only audit logs that match all specified criteria. The test also validates that pagination structure is maintained correctly regardless of filter selectivity.
 *
 * 1. Super administrator registers and authenticates using authorize_super_admin_join utility.
 * 2. Query audit logs without filters to get baseline results and verify pagination structure.
 * 3. Filter by action_type='create' and validate all returned logs have matching actionType.
 * 4. Filter by target_entity_type='seller' and validate all returned logs have matching targetEntityType.
 * 5. Apply combined filters (action_type='create' AND target_entity_type='seller') and validate both criteria match.
 * 6. Test different action_type values ('approve', 'reject', 'ban') to ensure filter flexibility.
 * 7. Verify pagination metadata (current page, limit, records, pages) is accurate for filtered results.
 * 8. Validate that response structure matches IPageIShoppingMallAdminAuditLog.ISummary with proper admin relation data.
 */
export async function test_api_admin_audit_logs_filtering_by_action_and_entity_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  superAdminConnection.headers = {
    Authorization: `Bearer ${authResult.token.access}`,
  };
  // 2. Query audit logs without filters (baseline)
  const baselineResult =
    await api.functional.shoppingMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(baselineResult);
  // Validate baseline pagination structure
  TestValidator.predicate(
    "baseline has valid pagination",
    () =>
      baselineResult.pagination.current >= 1 &&
      baselineResult.pagination.limit >= 1 &&
      baselineResult.pagination.records >= 0 &&
      baselineResult.pagination.pages >= 0,
  );
  TestValidator.predicate("baseline data is array", () =>
    Array.isArray(baselineResult.data),
  );
  // 3. Filter by action_type='create'
  const createActionFilter =
    await api.functional.shoppingMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action_type: "create",
          page: 1,
          limit: 50,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(createActionFilter);
  // Validate all results match action_type filter
  for (const log of createActionFilter.data) {
    TestValidator.equals(
      "action_type matches create filter",
      log.actionType,
      "create",
    );
  }
  // 4. Filter by target_entity_type='seller'
  const sellerEntityFilter =
    await api.functional.shoppingMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          target_entity_type: "seller",
          page: 1,
          limit: 50,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(sellerEntityFilter);
  // Validate all results match target_entity_type filter
  for (const log of sellerEntityFilter.data) {
    TestValidator.equals(
      "target_entity_type matches seller filter",
      log.targetEntityType,
      "seller",
    );
  }
  // 5. Combined filters: action_type='create' AND target_entity_type='seller'
  const combinedFilter =
    await api.functional.shoppingMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action_type: "create",
          target_entity_type: "seller",
          page: 1,
          limit: 50,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Validate all results match both criteria
  for (const log of combinedFilter.data) {
    TestValidator.equals(
      "combined action_type matches",
      log.actionType,
      "create",
    );
    TestValidator.equals(
      "combined target_entity_type matches",
      log.targetEntityType,
      "seller",
    );
  }
  // 6. Test different action_type values
  const actionTypesToTest = ["approve", "reject", "ban"] as const;
  for (const actionType of actionTypesToTest) {
    const actionFilter =
      await api.functional.shoppingMall.superAdmin.admin.audit_logs.index(
        superAdminConnection,
        {
          body: {
            action_type: actionType,
            page: 1,
            limit: 30,
          } satisfies IShoppingMallAdminAuditLog.IRequest,
        },
      );
    typia.assert(actionFilter);
    for (const log of actionFilter.data) {
      TestValidator.equals(
        `action_type matches ${actionType} filter`,
        log.actionType,
        actionType,
      );
    }
  }
  // 7. Verify pagination metadata accuracy for filtered results
  TestValidator.predicate(
    "createActionFilter pagination is valid",
    () =>
      createActionFilter.pagination.current === 1 &&
      createActionFilter.pagination.limit === 50 &&
      createActionFilter.pagination.records >= createActionFilter.data.length &&
      createActionFilter.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "combinedFilter pagination is valid",
    () =>
      combinedFilter.pagination.current === 1 &&
      combinedFilter.pagination.limit === 50 &&
      combinedFilter.pagination.records >= combinedFilter.data.length &&
      combinedFilter.pagination.pages >= 1,
  );
  // 8. Validate response data count matches pagination records
  TestValidator.predicate(
    "baseline data length matches pagination",
    () => baselineResult.data.length <= baselineResult.pagination.limit,
  );
  if (baselineResult.data.length > 0) {
    const sampleLog = baselineResult.data[0];
    TestValidator.predicate(
      "admin relation is populated",
      () =>
        sampleLog.admin.id !== undefined && sampleLog.admin.email !== undefined,
    );
  }
}
