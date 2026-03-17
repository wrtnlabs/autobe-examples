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

export async function test_api_super_admin_audit_logs_filtered_by_action(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: "https://test.com/join",
        referrer: "https://test.com",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create customer to submit promotion request
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Create admin promotion request
  const promotionRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {},
    );
  typia.assert(promotionRequest);
  // 4. Super admin approves the promotion request to generate audit log entry
  const approvalTime = new Date();
  const updatedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        promotionRequestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Query audit logs with action filter for 'approve_promotion'
  const auditLogsResult =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action: "approve_promotion",
          limit: 50,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsResult);
  // Verify results contain only matching entries
  TestValidator.predicate(
    "audit logs contain approve_promotion action",
    auditLogsResult.data.length > 0 &&
      auditLogsResult.data.every((log) => log.action === "approve_promotion"),
  );
  // 6. Test partial matching on action field with 'promotion' substring
  const partialMatchResult =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action: "promotion",
          limit: 50,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(partialMatchResult);
  // Verify partial matching returns results
  TestValidator.predicate(
    "partial action match returns results",
    partialMatchResult.data.every((log) => log.action.includes("promotion")),
  );
  // 7. Test combined filters (action + date range)
  const oneHourAgo = new Date(
    approvalTime.getTime() - 60 * 60 * 1000,
  ).toISOString();
  const oneHourFromNow = new Date(
    approvalTime.getTime() + 60 * 60 * 1000,
  ).toISOString();
  const combinedFilterResult =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action: "approve_promotion",
          createdAtFrom: oneHourAgo,
          createdAtTo: oneHourFromNow,
          limit: 50,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Verify combined filters work
  TestValidator.predicate(
    "combined filters return matching results",
    combinedFilterResult.data.length > 0 &&
      combinedFilterResult.data.every(
        (log) =>
          log.action === "approve_promotion" &&
          new Date(log.createdAt) >= new Date(oneHourAgo) &&
          new Date(log.createdAt) <= new Date(oneHourFromNow),
      ),
  );
  // 8. Test empty results for non-matching criteria
  const emptyResult =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action: "reject_promotion",
          limit: 50,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Verify no results for unmatched action
  TestValidator.equals(
    "empty results for non-matching action",
    emptyResult.data.length,
    0,
  );
  // 9. Test date range filtering with future dates to get empty results
  const futureDateResult =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: "2099-01-01T00:00:00.000Z",
          createdAtTo: "2099-12-31T23:59:59.999Z",
          limit: 50,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(futureDateResult);
  // Verify no results for future date range
  TestValidator.equals(
    "empty results for future date range",
    futureDateResult.data.length,
    0,
  );
}
