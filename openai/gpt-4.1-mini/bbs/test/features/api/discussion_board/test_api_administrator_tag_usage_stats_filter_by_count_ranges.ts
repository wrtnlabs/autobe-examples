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

export async function test_api_administrator_tag_usage_stats_filter_by_count_ranges(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
    },
  });
  typia.assert(adminJoin);
  adminConnection.headers ??= {};
  adminConnection.headers["Authorization"] = adminJoin.token.access;
  const testCases: IDiscussionBoardMvTagUsageStat.IRequest[] = [
    {
      articleCountMin: 1,
      articleCountMax: 10,
      commentCountMin: 0,
      commentCountMax: 20,
      page: 1,
      limit: 10,
      sortKey: "articleCount",
    },
    {
      articleCountMin: 5,
      articleCountMax: 15,
      commentCountMin: 5,
      commentCountMax: 50,
      page: 1,
      limit: 20,
      sortKey: "commentCount",
    },
    {
      articleCountMin: undefined,
      articleCountMax: 5,
      commentCountMin: 10,
      commentCountMax: undefined,
      page: 1,
      limit: 5,
      sortKey: "tagName",
    },
  ];
  for (const filter of testCases) {
    const response =
      await api.functional.discussionBoard.administrator.tag_usage_stats.index(
        adminConnection,
        { body: filter },
      );
    typia.assert(response);
    TestValidator.predicate(
      "pagination current page is correct",
      response.pagination.current === (filter.page ?? 1),
    );
    TestValidator.predicate(
      "pagination limit is correct",
      response.pagination.limit === (filter.limit ?? 10),
    );
    TestValidator.predicate(
      "pagination records is non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      response.pagination.pages >= 0,
    );
    for (const stat of response.data) {
      typia.assert(stat);
      // Use stat.id instead of tag.id because tag summary has no id property
      if (filter.articleCountMin !== undefined)
        TestValidator.predicate(
          `tag stat id ${stat.id} articleCount >= min`,
          stat.articleCount >= filter.articleCountMin!,
        );
      if (filter.articleCountMax !== undefined)
        TestValidator.predicate(
          `tag stat id ${stat.id} articleCount <= max`,
          stat.articleCount <= filter.articleCountMax!,
        );
      if (filter.commentCountMin !== undefined)
        TestValidator.predicate(
          `tag stat id ${stat.id} commentCount >= min`,
          stat.commentCount >= filter.commentCountMin!,
        );
      if (filter.commentCountMax !== undefined)
        TestValidator.predicate(
          `tag stat id ${stat.id} commentCount <= max`,
          stat.commentCount <= filter.commentCountMax!,
        );
    }
  }
}
