import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
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

export async function test_api_report_queue_filter_and_search(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  const request = {
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformReport.IRequest;
  const page = await api.functional.communityPlatform.admin.reports.index(
    adminConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "pagination current is valid",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data does not exceed limit",
    page.data.length <= page.pagination.limit,
  );
  for (const report of page.data) {
    typia.assert(report);
    TestValidator.predicate("report id exists", report.id.length > 0);
    TestValidator.predicate(
      "report target type exists",
      report.targetType.length > 0,
    );
    TestValidator.predicate(
      "report target id exists",
      report.targetId.length > 0,
    );
    TestValidator.predicate("report reason exists", report.reason.length >= 0);
    TestValidator.predicate("report status exists", report.status.length > 0);
    TestValidator.predicate(
      "report createdAt exists",
      report.createdAt.length > 0,
    );
    TestValidator.predicate(
      "report updatedAt exists",
      report.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "report community id exists",
      report.community.id.length > 0,
    );
    TestValidator.predicate(
      "report community name exists",
      report.community.name.length >= 0,
    );
    TestValidator.predicate("report member summary exists", true);
  }
  const emptySearch =
    await api.functional.communityPlatform.admin.reports.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          reason: `no-match-${RandomGenerator.alphabets(16)}`,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals("empty search pages", emptySearch.pagination.pages, 0);
  TestValidator.equals("empty search data length", emptySearch.data.length, 0);
  const timeFiltered =
    await api.functional.communityPlatform.admin.reports.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          createdAtFrom: new Date(
            Date.now() - 1000 * 60 * 60 * 24,
          ).toISOString(),
          createdAtTo: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(timeFiltered);
  for (const report of timeFiltered.data) {
    TestValidator.predicate("createdAt present", report.createdAt.length > 0);
    TestValidator.predicate("updatedAt present", report.updatedAt.length > 0);
  }
}
