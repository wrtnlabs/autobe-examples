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

export async function test_api_administrator_article_statistics_overview_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that a non-administrator user is denied access to the administrator-only article statistics overview endpoint.
  // Use the base connection without administrator authentication
  const baseConnection: api.IConnection = { host: connection.host };
  // Attempt to call the article statistics overview endpoint with no authorization
  await TestValidator.httpError(
    "should forbid unauthorized access to article statistics overview",
    403,
    async () => {
      await api.functional.discussionBoard.administrator.article_statistics.overview.getArticleStatisticsOverview(
        baseConnection,
      );
    },
  );
}
