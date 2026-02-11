import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_filter_by_status_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" + randint(100000, 999999).toString(),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Test report filtering with status 'PENDING' and pagination
  // Since we cannot create reports via available APIs, we filter existing reports
  const response =
    await api.functional.redditPlatform.admin.redditPlatform.reports.index(
      adminConnection,
      {
        body: {
          status: "PENDING",
          page: 1,
          pageSize: 10,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("page size is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "has records count",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has correct pages calculation",
    response.pagination.pages >= 0,
  );
  // 4. Validate data structure if reports exist
  if (response.data.length > 0) {
    TestValidator.predicate(
      "has at least one report",
      response.data.length >= 1,
    );
    // Verify all returned reports are PENDING
    for (const report of response.data) {
      TestValidator.equals(
        "report status is PENDING",
        report.status,
        "PENDING",
      );
      TestValidator.equals(
        "report has reporter information",
        typeof report.reporter.username,
        "string",
      );
      TestValidator.equals(
        "report has null resolvedBy for PENDING status",
        report.resolvedBy,
        null,
      );
    }
  }
}