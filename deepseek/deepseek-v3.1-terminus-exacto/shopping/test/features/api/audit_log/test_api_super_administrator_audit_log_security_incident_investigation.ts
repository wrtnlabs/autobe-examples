import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test audit log search for security incident investigation scenarios.
 * Focus on high-severity events, failed authentication attempts, and forensic analysis.
 */
export async function test_api_super_administrator_audit_log_security_incident_investigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // 2. Test critical severity events within recent timeframe
  const recentCriticalEvents =
    await api.functional.ecommerce.superAdministrator.audit_logs.index(
      superAdminConnection,
      {
        body: {
          severity: "critical",
          created_at_start: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(), // Last 24 hours
          success: true,
          limit: 10,
          page: 1,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(recentCriticalEvents);
  // 3. Test security-related event type filtering
  const securityEvents =
    await api.functional.ecommerce.superAdministrator.audit_logs.index(
      superAdminConnection,
      {
        body: {
          event_type: "security_incident",
          event_subtype: "authentication_failure",
          success: false,
          severity: "error",
          limit: 20,
          page: 1,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(securityEvents);
  // 4. Test IP-based forensic analysis
  const testIP = typia.random<string & tags.Format<"ipv4">>();
  const ipAnalysis =
    await api.functional.ecommerce.superAdministrator.audit_logs.index(
      superAdminConnection,
      {
        body: {
          ip_address: testIP satisfies string | null as
            | (string & tags.Format<"ipv4">)
            | null,
          success: false,
          created_at_end: new Date().toISOString(),
          limit: 15,
          page: 1,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(ipAnalysis);
  // 5. Test failed actions search for vulnerability identification
  const failedActions =
    await api.functional.ecommerce.superAdministrator.audit_logs.index(
      superAdminConnection,
      {
        body: {
          success: false,
          severity: "error",
          created_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // Last 7 days
          limit: 25,
          page: 1,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(failedActions);
  // 6. Test comprehensive combination search with multiple parameters
  const comprehensiveSearch =
    await api.functional.ecommerce.superAdministrator.audit_logs.index(
      superAdminConnection,
      {
        body: {
          event_type: "administrative_action",
          severity: "critical",
          success: true,
          resource_type: "user",
          created_at_start: new Date(
            Date.now() - 48 * 60 * 60 * 1000,
          ).toISOString(), // Last 48 hours
          created_at_end: new Date().toISOString(),
          limit: 30,
          page: 1,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(comprehensiveSearch);
  // 7. Test edge case: events with null resource_type and null resource_id
  const nullResourceEvents =
    await api.functional.ecommerce.superAdministrator.audit_logs.index(
      superAdminConnection,
      {
        body: {
          resource_type: null,
          resource_id: null,
          limit: 5,
          page: 1,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(nullResourceEvents);
  // 8. Test pagination with different limits
  const paginationTest =
    await api.functional.ecommerce.superAdministrator.audit_logs.index(
      superAdminConnection,
      {
        body: {
          limit: 5,
          page: 2,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Business logic validation
  TestValidator.predicate(
    "pagination metadata present",
    paginationTest.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current page",
    paginationTest.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit", paginationTest.pagination.limit, 5);
  // Verify audit trail provides sufficient detail for compliance
  if (securityEvents.data.length > 0) {
    const sampleEvent = securityEvents.data[0];
    TestValidator.predicate(
      "event has description",
      sampleEvent.action_description.length > 0,
    );
    TestValidator.predicate(
      "event has timestamp",
      sampleEvent.created_at !== undefined,
    );
    TestValidator.predicate(
      "event has severity",
      sampleEvent.severity !== undefined,
    );
    TestValidator.predicate(
      "event has success status",
      sampleEvent.success !== undefined,
    );
  }
}
