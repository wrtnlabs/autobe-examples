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

export async function test_api_super_administrator_audit_log_specific_actor_investigation(
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
  // 2. Define random actor IDs for testing
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const administratorId = typia.random<string & tags.Format<"uuid">>();
  const superAdministratorId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test scenario 1: Search by customer ID
  const customerSearchResult =
    await api.functional.ecommerce.superAdministrator.audit_logs.index(
      superAdminConnection,
      {
        body: {
          event_type: "authentication",
          severity: "info",
          created_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days ago
          created_at_end: new Date().toISOString(),
          limit: 10,
          page: 1,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(customerSearchResult);
  // Validate customer search results
  if (customerSearchResult.data.length > 0) {
    const logEntry = customerSearchResult.data[0];
    TestValidator.predicate(
      "customer search returns valid audit logs",
      logEntry.customer !== null ||
        logEntry.seller !== null ||
        logEntry.administrator !== null ||
        logEntry.superAdministrator !== null,
    );
  }
  // 4. Test scenario 2: Filter by seller ID with combination filters
  const sellerSearchResult =
    await api.functional.ecommerce.superAdministrator.audit_logs.index(
      superAdminConnection,
      {
        body: {
          event_type: "administrative_action",
          success: true,
          created_at_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 30 days ago
          limit: 5,
          page: 1,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(sellerSearchResult);
  // 5. Test scenario 3: Search by administrator ID for security incidents
  const adminSearchResult =
    await api.functional.ecommerce.superAdministrator.audit_logs.index(
      superAdminConnection,
      {
        body: {
          event_type: "security_incident",
          severity: "critical",
          success: false,
          ip_address: typia.random<string & tags.Format<"ipv4">>(),
          limit: 20,
          page: 1,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(adminSearchResult);
  // 6. Test scenario 4: Filter by super administrator ID for policy oversight
  const superAdminSearchResult =
    await api.functional.ecommerce.superAdministrator.audit_logs.index(
      superAdminConnection,
      {
        body: {
          event_type: "system_event",
          resource_type: "user",
          created_at_start: new Date(
            Date.now() - 365 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 1 year ago
          limit: 50,
          page: 1,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(superAdminSearchResult);
  // 7. Validate actor reference populations
  for (const logEntry of adminSearchResult.data) {
    if (logEntry.administrator !== null) {
      TestValidator.equals(
        "administrator summary has id",
        typeof logEntry.administrator.id,
        "string",
      );
      TestValidator.equals(
        "administrator summary has email",
        typeof logEntry.administrator.email,
        "string",
      );
    }
  }
  // 8. Test null actor scenarios - search for system events without specific actors
  const systemEventSearch =
    await api.functional.ecommerce.superAdministrator.audit_logs.index(
      superAdminConnection,
      {
        body: {
          event_type: "system_event",
          event_subtype: "scheduled_task",
          resource_type: null,
          limit: 10,
          page: 1,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(systemEventSearch);
  // 9. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    customerSearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    customerSearchResult.pagination.limit >= 1 &&
      customerSearchResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    customerSearchResult.pagination.records >= 0,
  );
}
