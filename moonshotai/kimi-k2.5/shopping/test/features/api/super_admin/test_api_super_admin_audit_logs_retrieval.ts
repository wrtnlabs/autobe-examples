import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test the super administrator's ability to retrieve audit logs for monitoring and compliance purposes.
 *
 * Scenario:
 * 1. Create a super admin account
 * 2. Create a customer who submits an admin promotion request
 * 3. The super admin reviews this request (approves) which generates audit log entries
 * 4. Test that the super admin can successfully retrieve the audit log list with pagination
 * 5. Verify the response contains pagination metadata and audit log entries
 * 6. Test filtering by action type to find specific administrative actions
 * 7. Test sorting by created_at to see newest logs first
 * 8. Ensure only superAdmin accounts can access this endpoint
 */
export async function test_api_super_admin_audit_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Create super admin account - this sets the authorization header
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://test.com/superadmin/join",
        referrer: "https://test.com",
        ip: "127.0.0.1",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Create customer account - this sets the authorization header
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer);
  // Customer submits admin promotion request
  const promotionRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason:
            "I have extensive experience in e-commerce management and would like to help moderate the platform.",
        },
      },
    );
  typia.assert(promotionRequest);
  // Super admin approves the promotion request - this generates an audit log entry
  const reviewedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        promotionRequestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(reviewedRequest);
  // Test 1: Retrieve audit logs with pagination (default sorting by created_at desc)
  const auditLogs =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(auditLogs);
  // Verify pagination metadata exists and has valid structure
  TestValidator.predicate(
    "pagination current is positive",
    auditLogs.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    auditLogs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    auditLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    auditLogs.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(auditLogs.data));
  // If audit logs exist, verify the admin information matches
  if (auditLogs.data.length > 0) {
    const log = auditLogs.data[0];
    TestValidator.equals(
      "audit log admin id matches super admin",
      log.admin.id,
      superAdmin.id,
    );
  }
  // Test 2: Filter by action type
  const filteredByAction =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          action: "approve",
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(filteredByAction);
  // Test 3: Filter by resource type
  const filteredByResource =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          resourceType: "admin_promotion_request",
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(filteredByResource);
  // Test 4: Verify that customer cannot access audit logs (permission test)
  await TestValidator.error("customer cannot access audit logs", async () => {
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  });
  // Test 5: Pagination with different page and limit
  const pageWithLimit =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(pageWithLimit);
  TestValidator.equals(
    "pagination limit matches request",
    pageWithLimit.pagination.limit,
    5,
  );
}
