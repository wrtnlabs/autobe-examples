import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceRecord";
import type { IShoppingMallComplianceReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceReport";
import type { IShoppingMallComplianceSystemStats } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceSystemStats";
import type { IShoppingMallComplianceViolationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceViolationSummary";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_compliance_report_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: `https://example.com/admin/join-${RandomGenerator.alphaNumeric(6)}`,
        referrer: `https://example.com/admin/signup-${RandomGenerator.alphaNumeric(6)}`,
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Retrieve compliance report using authenticated admin connection
  const report: IShoppingMallComplianceReport =
    await api.functional.shoppingMall.admin.reports.compliance.index(
      adminConnection,
    );
  typia.assert(report);
}
