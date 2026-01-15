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
export async function test_api_compliance_records_admin_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  // Step 2: Calculate date range (7 days ago to today)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // Step 3: Query compliance records with date range and pagination
  const response: IPageIShoppingMallComplianceRecord.ISummary =
    await api.functional.shoppingMall.admin.compliance.records.index(
      adminConnection,
      {
        body: {
          startDate: sevenDaysAgo.toISOString(),
          endDate: now.toISOString(),
          page: 1,
          limit: 25,
          sortBy: "createdAt",
          sortOrder: "asc",
        } satisfies IShoppingMallComplianceRecord.IRequest,
      },
    );
  typia.assert(response);
  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 25);
  TestValidator.predicate(
    "pagination has records",
    () => response.pagination.records > 0,
  );
  // Step 5: Validate all records fall within date range
  for (const record of response.data) {
    const eventTime = new Date(record.eventTime);
    TestValidator.predicate(
      "record eventTime within date range",
      () => eventTime >= sevenDaysAgo && eventTime <= now,
    );
  }
  // Step 6: Verify chronological ordering of records (oldest first)
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentRecordTime = new Date(response.data[i].eventTime);
    const nextRecordTime = new Date(response.data[i + 1].eventTime);
    TestValidator.predicate(
      "records are chronologically ordered",
      () => currentRecordTime <= nextRecordTime,
    );
  }
}
