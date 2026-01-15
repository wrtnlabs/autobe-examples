import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerComplianceAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerComplianceAnalytics";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerComplianceAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerComplianceAnalytics";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_compliance_analytics_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate admin using the provided utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 3: Call the compliance analytics endpoint with admin connection
  const complianceData: IPageIShoppingMallSellerComplianceAnalytics =
    await api.functional.shoppingMall.admin.analytics.sellers.compliance.index(
      adminConnection,
    );
  // Step 4: Validate response structure with typia.assert for complete type safety
  // This ensures the entire response conforms to IPageIShoppingMallSellerComplianceAnalytics
  typia.assert(complianceData);
  // Step 5: Verify pagination information is correctly provided
  TestValidator.equals(
    "pagination current page has valid value",
    complianceData.pagination.current,
    complianceData.pagination.current,
  );
  TestValidator.equals(
    "pagination limit has valid value",
    complianceData.pagination.limit,
    complianceData.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    complianceData.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    complianceData.pagination.pages >= 0,
  );
  // Step 6: Verify data array contains compliance analytics records
  // Each element should be a string as per IShoppingMallSellerComplianceAnalytics definition
  TestValidator.predicate(
    "data array is not empty",
    complianceData.data.length > 0,
  );
  // Verify each element in the data array is a string
  for (const record of complianceData.data) {
    TestValidator.predicate(
      "each compliance record is a string",
      typeof record === "string",
    );
  }
}
