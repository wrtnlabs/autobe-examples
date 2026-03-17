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

export async function test_api_super_admin_audit_logs_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin account
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminJoinConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: "https://test.com/superadmin/register",
        referrer: "https://test.com",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // Login as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
  // Create 25 customers and have them submit promotion requests
  const promotionRequests: IEcommerceMallAdminPromotionRequest[] = [];
  for (let i = 0; i < 25; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {});
    const request =
      await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
        customerConnection,
        {},
      );
    promotionRequests.push(request);
  }
  // Generate audit logs by approving/rejecting promotion requests
  for (let i = 0; i < promotionRequests.length; i++) {
    const request = promotionRequests[i];
    const isApproved = i % 3 !== 0; // 2/3 approved, 1/3 rejected
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        promotionRequestId: request.id,
        body: {
          status: isApproved ? "approved" : "rejected",
          rejectionReason: isApproved ? null : "Insufficient qualifications",
        } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
      },
    );
  }
  // Test: First page with limit 10
  const page1 = await api.functional.ecommerceMall.superAdmin.audit_logs.index(
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
  typia.assert(page1);
  TestValidator.equals("page 1 data count", page1.data.length, 10);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals("page 1 total records", page1.pagination.records, 25);
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 3);
  // Test: Second page with limit 10
  const page2 = await api.functional.ecommerceMall.superAdmin.audit_logs.index(
    superAdminConnection,
    {
      body: {
        page: 2,
        limit: 10,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 data count", page2.data.length, 10);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  TestValidator.equals("page 2 total records", page2.pagination.records, 25);
  TestValidator.equals("page 2 total pages", page2.pagination.pages, 3);
  // Verify no overlap between page 1 and page 2
  const page1Ids = new Set(page1.data.map((log) => log.id));
  const page2Ids = new Set(page2.data.map((log) => log.id));
  const overlap = Array.from(page1Ids).some((id) => page2Ids.has(id));
  TestValidator.predicate(
    "page 1 and page 2 have no overlapping records",
    !overlap,
  );
  // Test: Last page (page 3) with limit 10 - should have 5 records (uneven)
  const page3 = await api.functional.ecommerceMall.superAdmin.audit_logs.index(
    superAdminConnection,
    {
      body: {
        page: 3,
        limit: 10,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals("page 3 data count (remainder)", page3.data.length, 5);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3.pagination.limit, 10);
  TestValidator.equals("page 3 total records", page3.pagination.records, 25);
  TestValidator.equals("page 3 total pages", page3.pagination.pages, 3);
  // Test: Large limit (100) - should return all records in one page
  const largeLimit =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(largeLimit);
  TestValidator.equals("large limit data count", largeLimit.data.length, 25);
  TestValidator.equals("large limit current", largeLimit.pagination.current, 1);
  TestValidator.equals("large limit pages", largeLimit.pagination.pages, 1);
  // Test: Sorting by created_at descending (newest first)
  for (let i = 0; i < page1.data.length - 1; i++) {
    const currentTime = new Date(page1.data[i].createdAt).getTime();
    const nextTime = new Date(page1.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      "created_at descending order",
      currentTime >= nextTime,
    );
  }
}
