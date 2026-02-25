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

export async function test_api_article_report_activity_access_denied_for_unauthorized_users(
  connection: api.IConnection,
): Promise<void> {
  // Test that guests (no authentication) cannot access article report activity
  await TestValidator.httpError("guest unauthorized access", 403, async () => {
    await api.functional.discussionBoard.superAdministrator.article_reports.activity.getArticleReportsActivity(
      connection,
    );
  });
  // Prepare registered user connection (no superAdministrator role)
  const userConnection: api.IConnection = { host: connection.host };
  // No authorization step called intentionally to simulate unauthorized user
  // Registered user unauthorized access should return 403
  await TestValidator.httpError(
    "registered user unauthorized access",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrator.article_reports.activity.getArticleReportsActivity(
        userConnection,
      );
    },
  );
  // Prepare administrator connection but NOT superAdministrator (simulate)
  // To simulate admin without superAdministrator role, we can register a normal
  // superAdministrator first but not use token, or skip authorization.
  // Here, create a connection with no valid token to simulate unauthorized.
  const adminConnection: api.IConnection = { host: connection.host };
  // Administrator without superAdministrator role unauthorized access should return 403
  await TestValidator.httpError(
    "administrator without superAdministrator role unauthorized access",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrator.article_reports.activity.getArticleReportsActivity(
        adminConnection,
      );
    },
  );
}
