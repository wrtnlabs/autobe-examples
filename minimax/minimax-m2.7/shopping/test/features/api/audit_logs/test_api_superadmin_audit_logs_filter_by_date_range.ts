import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering super administrator audit logs by date range.
 *
 * Validates the audit log filtering functionality by date range to support compliance reviews and security investigations. Tests various date range scenarios including full range filtering, partial ranges (from only or to only), boundary conditions, and combining date filters with other query parameters like action and target_type.
 *
 * 1. Authenticate as super admin via authorize_super_admin_join
 * 2. Create audit logs by performing super admin actions
 * 3. Test full date range filtering (created_at_from AND created_at_to)
 * 4. Test partial filtering (only from, only to)
 * 5. Validate all results fall within specified boundaries
 * 6. Test pagination with date range filters
 * 7. Test combining date range with other filters
 */
export async function test_api_superadmin_audit_logs_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(authorized);
  // Create additional super admin to generate more audit logs
  const superAdminConnection2: api.IConnection = { host: connection.host };
  const authorized2: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection2, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(authorized2);
  // Record timestamps before and after actions
  const beforeAllActions = new Date().toISOString();
  // Perform another login action to generate additional audit logs
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(loginConnection, {
    body: {
      email: authorized.email,
      password: "dummy_wrong_password_for_audit",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const afterActions = new Date().toISOString();
  // 2. Test full date range filtering
  const fullRangeResponse =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          created_at_from: beforeAllActions,
          created_at_to: afterActions,
          limit: 100,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(fullRangeResponse);
  // Validate all records are within date range
  for (const log of fullRangeResponse.data) {
    const createdAt = new Date(log.created_at).getTime();
    const fromTime = new Date(beforeAllActions).getTime();
    const toTime = new Date(afterActions).getTime();
    TestValidator.predicate(
      "log created_at within range",
      createdAt >= fromTime && createdAt <= toTime,
    );
  }
  // 3. Test only created_at_from filter
  const fromOnlyResponse =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          created_at_from: beforeAllActions,
          limit: 100,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(fromOnlyResponse);
  for (const log of fromOnlyResponse.data) {
    const createdAt = new Date(log.created_at).getTime();
    const fromTime = new Date(beforeAllActions).getTime();
    TestValidator.predicate(
      "log created_at >= from date",
      createdAt >= fromTime,
    );
  }
  // 4. Test only created_at_to filter
  const toOnlyResponse =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          created_at_to: afterActions,
          limit: 100,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(toOnlyResponse);
  for (const log of toOnlyResponse.data) {
    const createdAt = new Date(log.created_at).getTime();
    const toTime = new Date(afterActions).getTime();
    TestValidator.predicate("log created_at <= to date", createdAt <= toTime);
  }
  // 5. Test pagination with date range
  const page1Response =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          created_at_from: beforeAllActions,
          created_at_to: afterActions,
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals("page 1 has data", page1Response.data.length > 0, true);
  TestValidator.equals(
    "pagination current",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1Response.pagination.limit, 5);
  // 6. Test combining date range with target_type filter
  const targetTypeFilterResponse =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          created_at_from: beforeAllActions,
          created_at_to: afterActions,
          target_type: "super_admin",
          limit: 100,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(targetTypeFilterResponse);
  for (const log of targetTypeFilterResponse.data) {
    if (log.target_type) {
      TestValidator.equals(
        "target_type is super_admin",
        log.target_type,
        "super_admin",
      );
    }
    const createdAt = new Date(log.created_at).getTime();
    const fromTime = new Date(beforeAllActions).getTime();
    const toTime = new Date(afterActions).getTime();
    TestValidator.predicate(
      "combined with target_type: created_at within range",
      createdAt >= fromTime && createdAt <= toTime,
    );
  }
  // 7. Test filtering by super_admin_id with date range
  const superAdminIdFilterResponse =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          created_at_from: beforeAllActions,
          created_at_to: afterActions,
          super_admin_id: authorized.id,
          limit: 100,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(superAdminIdFilterResponse);
  for (const log of superAdminIdFilterResponse.data) {
    if (log.superAdmin) {
      TestValidator.equals(
        "superAdmin id matches filter",
        log.superAdmin.id,
        authorized.id,
      );
    }
    const createdAt = new Date(log.created_at).getTime();
    const fromTime = new Date(beforeAllActions).getTime();
    const toTime = new Date(afterActions).getTime();
    TestValidator.predicate(
      "combined with super_admin_id: created_at within range",
      createdAt >= fromTime && createdAt <= toTime,
    );
  }
  // 8. Verify no date filter returns records
  const noFilterResponse =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(noFilterResponse);
  TestValidator.predicate(
    "no filter returns records",
    noFilterResponse.data.length > 0,
  );
}
