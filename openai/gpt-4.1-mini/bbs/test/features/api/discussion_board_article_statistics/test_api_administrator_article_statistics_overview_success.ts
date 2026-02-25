import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticleStatisticsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleStatisticsOverview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_article_statistics_overview_success(
  connection: api.IConnection,
): Promise<void> {
  // Administrator connection for authorized calls
  const adminConnection: api.IConnection = { host: connection.host };
  // Administrator join request body with random email and password
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234",
  } satisfies IDiscussionBoardAdministrator.IJoin;
  // Join as administrator to obtain authorized tokens
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: joinBody,
  });
  // Set authorization header for adminConnection
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // Call the article statistics overview endpoint as authorized admin
  const response =
    await api.functional.discussionBoard.administrator.article_statistics.overview.getArticleStatisticsOverview(
      adminConnection,
    );
  // Validate the response type against the expected DTO
  typia.assert(response);
  // Confirm response keys are of boolean type as per DTO
  TestValidator.predicate(
    "totalArticlesCount is boolean",
    typeof response.totalArticlesCount === "boolean",
  );
  TestValidator.predicate(
    "articlesBySection is boolean",
    typeof response.articlesBySection === "boolean",
  );
  TestValidator.predicate(
    "tagUsageStats is boolean",
    typeof response.tagUsageStats === "boolean",
  );
}
