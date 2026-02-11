import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_moderator_reports_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  // 2. Since we cannot create reports and don't have access to communityId for approval,
  //    we skip report approval and focus on filtering.
  // 3. Filter by pending status
  const pendingReportResponse =
    await api.functional.redditCommunity.communityModerator.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          target_type: "comment",
          page: 1,
          limit: 10,
          sortBy: "newest",
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(pendingReportResponse);
  TestValidator.predicate(
    "pending reports state validation",
    () =>
      pendingReportResponse.pagination.current >= 1 &&
      pendingReportResponse.pagination.limit >= 1 &&
      pendingReportResponse.pagination.records >= 0 &&
      Array.isArray(pendingReportResponse.data) &&
      pendingReportResponse.data.every((r) => r.status === "pending"),
  );
  // 4. Filter by approved status
  const approvedReportResponse =
    await api.functional.redditCommunity.communityModerator.reports.index(
      moderatorConnection,
      {
        body: {
          status: "approved",
          target_type: "comment",
          page: 1,
          limit: 10,
          sortBy: "newest",
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(approvedReportResponse);
  TestValidator.predicate(
    "approved reports state validation",
    () =>
      approvedReportResponse.pagination.current >= 1 &&
      approvedReportResponse.pagination.limit >= 1 &&
      approvedReportResponse.pagination.records >= 0 &&
      Array.isArray(approvedReportResponse.data) &&
      approvedReportResponse.data.every((r) => r.status === "approved"),
  );
  // 5. Filter by dismissed status
  const dismissedReportResponse =
    await api.functional.redditCommunity.communityModerator.reports.index(
      moderatorConnection,
      {
        body: {
          status: "dismissed",
          target_type: "comment",
          page: 1,
          limit: 10,
          sortBy: "newest",
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(dismissedReportResponse);
  TestValidator.predicate(
    "dismissed reports state validation",
    () =>
      dismissedReportResponse.pagination.current >= 1 &&
      dismissedReportResponse.pagination.limit >= 1 &&
      dismissedReportResponse.pagination.records >= 0 &&
      Array.isArray(dismissedReportResponse.data) &&
      dismissedReportResponse.data.every((r) => r.status === "dismissed"),
  );
  // 6. All statuses are validated independently - no need for additional checks
}
