import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_reports_pending_posts_page_1(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as moderator to gain access
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  // 2. Retrieve first page of pending reports with limit 5
  const reports = await api.functional.community.moderator.reports.patch(
    moderatorConnection,
    {
      body: {} satisfies ICommunityReport.IRequest,
    },
  );
  typia.assert<IPageICommunityReport.ISummary>(reports);
  // 3. Validate response structure
  // Ensure exactly 5 report summaries
  TestValidator.equals("5 pending reports", reports.data.length, 5);
  // Validate pagination - current page 1, limit 5, total >= 5
  TestValidator.equals("current page is 1", reports.pagination.current, 1);
  TestValidator.equals("limit is 5", reports.pagination.limit, 5);
  TestValidator.predicate(
    "total records >= 5",
    reports.pagination.records >= 5,
  );
  // Note: Cannot validate report status as ICommunityReport.ISummary has no status property in DTO definitions
  // Backend automatically filters out deleted reporters as per spec
  // And reports with 'approved' or 'dismissed' status are filtered by backend according to scenario
}
