import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSecurityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityReport";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_security_report_access_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and register a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: `https://example.com/admin/join-${RandomGenerator.alphaNumeric(6)}`,
    referrer: `https://example.com/admin/signup-${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCredentials },
  );
  typia.assert(admin);
  // Step 2: Access the security report using the admin connection
  const securityReport: IShoppingMallSecurityReport =
    await api.functional.shoppingMall.admin.reports.security.index(
      adminConnection,
    );
  typia.assert(securityReport);
  // Step 3: Validate essential business metrics are positive (non-zero) as expected in active system
  TestValidator.predicate(
    "audit logs count represents active system",
    securityReport.auditLogsCount > 0,
  );
  TestValidator.predicate(
    "monitoring alerts count represents active system",
    securityReport.monitoringAlertsCount > 0,
  );
  TestValidator.predicate(
    "security policies count represents active system",
    securityReport.securityPoliciesCount > 0,
  );
  TestValidator.predicate(
    "payment gateway logs count represents active system",
    securityReport.paymentGatewayLogsCount > 0,
  );
  TestValidator.predicate(
    "payment audit logs count represents active system",
    securityReport.paymentAuditLogsCount > 0,
  );
  TestValidator.predicate(
    "user flags count represents active system",
    securityReport.userFlagsCount > 0,
  );
  TestValidator.predicate(
    "seller compliance history count represents active system",
    securityReport.sellerComplianceHistoryCount > 0,
  );
  TestValidator.predicate(
    "review moderation logs count represents active system",
    securityReport.reviewModerationLogsCount > 0,
  );
  TestValidator.predicate(
    "total issue count represents active system",
    securityReport.totalIssueCount > 0,
  );
  TestValidator.predicate(
    "critical issues count represents active system",
    securityReport.criticalIssuesCount > 0,
  );
  TestValidator.predicate(
    "policy violation count represents active system",
    securityReport.policyViolationCount > 0,
  );
  TestValidator.predicate(
    "actions taken count represents active system",
    securityReport.actionsTakenCount > 0,
  );
  // Step 4: Verify that an unauthenticated user cannot access the security report
  // Create a guest connection (unauthenticated)
  const guestConnection: api.IConnection = { host: connection.host };
  // Verify that accessing the security report without admin privileges returns 401 error
  await TestValidator.error(
    "non-admin user should receive 401 Unauthorized",
    async () => {
      await api.functional.shoppingMall.admin.reports.security.index(
        guestConnection,
      );
    },
  );
}
