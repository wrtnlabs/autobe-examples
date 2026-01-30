import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsUserReport";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_user_reports_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ICommunityBbsModerator.IJoin,
  });
  // Fetch reports with pagination and sorting
  const reportsResponse =
    await api.functional.communityBbs.moderator.users.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          page: 2,
          limit: 10,
          sortBy: "created_at",
          order: "desc",
        } satisfies ICommunityBbsUserReport.IRequest,
      },
    );
  typia.assert(reportsResponse);
  // Validate pagination metadata
  const { pagination, data } = reportsResponse;
  TestValidator.equals("page should be 2", pagination.current, 2);
  TestValidator.equals("limit should be 10", pagination.limit, 10);
  TestValidator.equals("data should contain 10 reports", data.length, 10);
  // Validate that reports are sorted by created_at in descending order (most recent first)
  // Since we can't validate category sorting (because category code is not provided in response)
  // we validate the primary possible sort field: created_at
  const dates = data.map((report) => report.created_at);
  const isSortedDescending = dates.every((date, index) => {
    if (index === 0) return true;
    return new Date(date) <= new Date(dates[index - 1]);
  });
  TestValidator.predicate(
    "reports should be sorted in descending order by created_at",
    isSortedDescending,
  );
  // Final check - total records should be at least 20 (since we're on page 2 with limit 10)
  TestValidator.predicate(
    "total records should be sufficient for pagination",
    pagination.records >= 20,
  );
}
