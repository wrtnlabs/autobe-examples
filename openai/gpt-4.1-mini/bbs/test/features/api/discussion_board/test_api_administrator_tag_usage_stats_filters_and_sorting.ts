import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMvTagUsageStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_tag_usage_stats_filters_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Join (Creation) and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const administratorAuthorized = await authorize_administrator_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
      },
    },
  );
  typia.assert(administratorAuthorized);
  // Update the adminConnection headers with Authorization token
  adminConnection.headers = {
    Authorization: administratorAuthorized.token.access,
  };
  // Function to call usage stats endpoint with given filters
  async function callUsageStats(
    body: IDiscussionBoardMvTagUsageStat.IRequest,
  ): Promise<IPageIDiscussionBoardMvTagUsageStat.ISummary> {
    const response =
      await api.functional.discussionBoard.administrator.tags.usage_stats.index(
        adminConnection,
        { body },
      );
    typia.assert(response);
    return response;
  }
  // 2. Test with no filters (default pagination)
  const fullPage = await callUsageStats({ page: 1, limit: 20 });
  // 3. Test minimum and maximum article count filters
  const articleCountMin = 1;
  const articleCountMax = 100;
  const filteredByArticleCount = await callUsageStats({
    articleCountMin,
    articleCountMax,
    page: 1,
    limit: 20,
  });
  filteredByArticleCount.data.forEach((stat) => {
    TestValidator.predicate(
      "article count min filter",
      stat.articleCount >= articleCountMin,
    );
    TestValidator.predicate(
      "article count max filter",
      stat.articleCount <= articleCountMax,
    );
  });
  // 4. Test minimum and maximum comment count filters
  const commentCountMin = 1;
  const commentCountMax = 1000;
  const filteredByCommentCount = await callUsageStats({
    commentCountMin,
    commentCountMax,
    page: 1,
    limit: 20,
  });
  filteredByCommentCount.data.forEach((stat) => {
    TestValidator.predicate(
      "comment count min filter",
      stat.commentCount >= commentCountMin,
    );
    TestValidator.predicate(
      "comment count max filter",
      stat.commentCount <= commentCountMax,
    );
  });
  // 5. Test sorting by articleCount descending
  const sortedByArticleCount = await callUsageStats({
    sortKey: "articleCount",
    page: 1,
    limit: 20,
  });
  for (let i = 0; i < sortedByArticleCount.data.length - 1; i++) {
    TestValidator.predicate(
      "sorted by article count descending",
      sortedByArticleCount.data[i].articleCount >=
        sortedByArticleCount.data[i + 1].articleCount,
    );
  }
  // 6. Test sorting by commentCount ascending
  const sortedByCommentCount = await callUsageStats({
    sortKey: "commentCount",
    page: 1,
    limit: 20,
  });
  for (let i = 0; i < sortedByCommentCount.data.length - 1; i++) {
    TestValidator.predicate(
      "sorted by comment count ascending",
      sortedByCommentCount.data[i].commentCount <=
        sortedByCommentCount.data[i + 1].commentCount,
    );
  }
  // 7. Validate pagination metadata reflects filtered data
  TestValidator.predicate(
    "pagination current page",
    fullPage.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit", fullPage.pagination.limit === 20);
  TestValidator.predicate("pagination pages", fullPage.pagination.pages >= 0);
  TestValidator.predicate(
    "pagination records",
    fullPage.pagination.records >= 0,
  );
}
