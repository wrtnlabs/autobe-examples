import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportReason";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_reason_filtered_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // This test validates the PATCH /communityPlatform/reportReasons endpoint.
  // 1. Admin join and authorize
  // 2. Basic pagination and sorting retrieval
  // 3. Validate pagination structure and data array existence
  // 4. Authorization enforcement
  // 1. Admin join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, { body: {} });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuth.token.access}`;
  // Helper: call reportReasons.index
  async function queryReportReasons(
    body: ICommunityPlatformReportReason.IRequest,
  ): Promise<IPageICommunityPlatformReportReason.ISummary> {
    const result = await api.functional.communityPlatform.reportReasons.index(
      adminConnection,
      { body },
    );
    return typia.assert(result);
  }
  // Test retrieving with empty filter returns a valid page
  const page = await queryReportReasons({});
  // Ensure pagination fields exist and are numbers
  TestValidator.predicate(
    "pagination has current page number",
    typeof page.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof page.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records count",
    typeof page.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages count",
    typeof page.pagination.pages === "number",
  );
  // Data is array
  TestValidator.predicate("data is array", Array.isArray(page.data));
  // Check pagination properties are >= 0
  TestValidator.predicate(
    "pagination current >= 0",
    page.pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit >= 0", page.pagination.limit >= 0);
  TestValidator.predicate(
    "pagination records >= 0",
    page.pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages >= 0", page.pagination.pages >= 0);
  // Perform pagination test with limit and current
  const limit = 2;
  const page1 = await queryReportReasons({ limit, current: 1 });
  const page2 = await queryReportReasons({ limit, current: 2 });
  // Both pages data array length <= limit
  TestValidator.predicate(
    `page 1 length <= ${limit}`,
    page1.data.length <= limit,
  );
  TestValidator.predicate(
    `page 2 length <= ${limit}`,
    page2.data.length <= limit,
  );
  // Authorization enforcement
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.communityPlatform.reportReasons.index(
      unauthenticatedConnection,
      { body: {} },
    );
  });
}
