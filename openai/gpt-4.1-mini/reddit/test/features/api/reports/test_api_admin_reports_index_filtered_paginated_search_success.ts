import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reports_index_filtered_paginated_search_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "StrongPassword123!",
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
    },
  });
  // 2. Prepare filter criteria
  const now = new Date();
  const startDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const endDate = now;
  const requestBody: ICommunityPlatformReport.IRequest = {
    contentType: "post",
    status: "pending",
    createdAtStart: startDate.toISOString(),
    createdAtEnd: endDate.toISOString(),
    page: 1,
    limit: 10,
  };
  // 3. Request paginated filtered reports
  const response = await api.functional.communityPlatform.admin.reports.index(
    adminConnection,
    {
      body: requestBody,
    },
  );
  // 4. Assert response structure
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate("limit is 10", response.pagination.limit === 10);
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  // 6. Validate each report item fields
  for (const report of response.data) {
    typia.assert(report);
    TestValidator.predicate(
      "report status is pending",
      report.status === "pending",
    );
    TestValidator.predicate(
      "reported contents count is integer",
      Number.isInteger(report.reportedContents_count),
    );
    TestValidator.predicate(
      "report createdAt is ISO datetime",
      !isNaN(Date.parse(report.created_at)),
    );
    TestValidator.predicate(
      "report updatedAt is ISO datetime",
      !isNaN(Date.parse(report.updated_at)),
    );
    TestValidator.predicate(
      "report deletedAt is null or ISO datetime",
      report.deleted_at === null || !isNaN(Date.parse(report.deleted_at)),
    );
  }
}
