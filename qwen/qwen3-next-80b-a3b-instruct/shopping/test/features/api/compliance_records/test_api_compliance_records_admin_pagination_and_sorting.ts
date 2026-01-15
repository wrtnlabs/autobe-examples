import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallComplianceRecord";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceRecord";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_compliance_records_admin_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test comprehensive pagination and sorting functionality for compliance
   * records. Administrator authenticates via join, then requests records with
   * limit=10, page=2, sortBy='createdAt', sortOrder='desc'. Validates that
   * exactly 10 records are returned on page 2, records are sorted by newest
   * to oldest, and that pagination metadata (current, limit, records, pages)
   * accurately reflects the total dataset size and query parameters.
   */
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(authResponse);
  // Configure pagination and sorting parameters
  const requestParams = {
    page: 2,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  } satisfies IShoppingMallComplianceRecord.IRequest;
  // Call the API with admin connection
  const result: IPageIShoppingMallComplianceRecord.ISummary =
    await api.functional.shoppingMall.admin.compliance.records.index(
      adminConnection,
      {
        body: requestParams,
      },
    );
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 2);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records > 20 (enough for 2 pages)",
    result.pagination.records > 20,
  );
  TestValidator.predicate(
    "pagination pages >= 2",
    result.pagination.pages >= 2,
  );
  // Validate response data length
  TestValidator.equals("data length equals limit", result.data.length, 10);
  // Validate sorting by createdAt descending (newest first)
  // Check that each record's createdAt is <= the previous record's createdAt
  for (let i = 0; i < result.data.length - 1; i++) {
    const currentCreatedAt = result.data[i].createdAt;
    const nextCreatedAt = result.data[i + 1].createdAt;
    TestValidator.predicate(
      "records sorted by createdAt desc",
      currentCreatedAt >= nextCreatedAt,
    );
  }
}
