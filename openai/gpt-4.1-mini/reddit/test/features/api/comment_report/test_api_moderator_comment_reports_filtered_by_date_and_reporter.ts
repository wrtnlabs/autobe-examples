import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comment_reports_create } from "../../../generate/generate_random_community_platform_user_comment_reports_create";
import { prepare_random_community_platform_comment_report } from "../../../prepare/prepare_random_community_platform_comment_report";

export async function test_api_moderator_comment_reports_filtered_by_date_and_reporter(
  connection: api.IConnection,
): Promise<void> {
  /*
     Test retrieval of comment reports filtered by creation date range and reporter user ID.
  
     1. Create a new user account and authenticate as that user.
     2. Create a new moderator account and authenticate as that moderator.
     3. Create at least one comment report authored by the user.
     4. Query comment reports as the moderator, filtering by reporter_user_id and created_at range.
     5. Assert all returned reports match the filters and response has valid pagination.
    */
  // 1. User join and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, { body: {} });
  typia.assert(userJoin);
  // 2. Moderator join and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(moderatorConnection, { body: {} });
  typia.assert(moderatorJoin);
  // 3. Create a comment report as the user
  const commentReport =
    await generate_random_community_platform_user_comment_reports_create(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(commentReport);
  // 4. Set filter time range to include createdAt of the comment report
  const createdAt = new Date(commentReport.createdAt);
  const createdAtFrom = new Date(createdAt.getTime() - 1000 * 60 * 60); // 1 hour before
  const createdAtTo = new Date(createdAt.getTime() + 1000 * 60 * 60); // 1 hour after
  // 5. Query comment reports with filters as moderator
  const filterRequest: ICommunityPlatformCommentReport.IRequest = {
    reporter_user_id: userJoin.id,
    created_at_from: createdAtFrom.toISOString(),
    created_at_to: createdAtTo.toISOString(),
    page: 1,
    limit: 10,
  };
  const response =
    await api.functional.communityPlatform.moderator.commentReports.index(
      moderatorConnection,
      { body: filterRequest },
    );
  typia.assert(response);
  // 6. Validate that all returned comment reports match reporter_user_id and createdAt filter
  for (const report of response.data) {
    TestValidator.predicate(
      `report reporterUser.id equals userJoin.id`,
      report.reporterUser.id === userJoin.id,
    );
    const reportCreatedAt = new Date(report.createdAt);
    TestValidator.predicate(
      `report createdAt in range`,
      reportCreatedAt >= createdAtFrom && reportCreatedAt <= createdAtTo,
    );
  }
  // 7. Validate pagination fields
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit >= 1", pagination.limit >= 1);
  TestValidator.predicate("pagination records >= 1", pagination.records >= 1);
  TestValidator.predicate("pagination pages >= 1", pagination.pages >= 1);
}
