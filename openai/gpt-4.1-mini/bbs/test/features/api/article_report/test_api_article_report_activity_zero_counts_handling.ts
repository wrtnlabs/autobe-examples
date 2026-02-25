import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleReportActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReportActivity";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_article_report_activity_zero_counts_handling(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for super administrator login
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate a new super administrator
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Call the article reports activity endpoint
  const activity =
    await api.functional.discussionBoard.superAdministrator.article_reports.activity.getArticleReportsActivity(
      superAdminConnection,
    );
  // Assert the response type
  typia.assert(activity);
  // Validate zero counts for all report metrics
  TestValidator.equals("totalReports should be zero", activity.totalReports, 0);
  TestValidator.equals(
    "resolvedReports should be zero",
    activity.resolvedReports,
    0,
  );
  TestValidator.equals(
    "pendingReports should be zero",
    activity.pendingReports,
    0,
  );
}
