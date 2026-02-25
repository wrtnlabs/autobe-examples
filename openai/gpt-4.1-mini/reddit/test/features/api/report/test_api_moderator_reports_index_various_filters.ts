import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_moderator_reports_index_various_filters(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Moderator retrieves paginated list of reports without any filter.
  // 1. Join as a moderator
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorJoinResponse = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(moderatorJoinResponse);
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = {
    Authorization: moderatorJoinResponse.token.access,
  };
  // 2. Join as a user to create prerequisite user reports
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResponse = await authorize_user_join(userConnection, {
    body: {},
  });
  typia.assert(userJoinResponse);
  const authorizedUserConnection: api.IConnection = { host: connection.host };
  authorizedUserConnection.headers = {
    Authorization: userJoinResponse.token.access,
  };
  // 3. Moderator creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      authorizedUserConnection,
      { body: {} },
    );
  typia.assert(community);
  // 4. User creates a report on the community
  const reportBody: ICommunityPlatformReport.ICreate = {
    /*
           The creation of a report requires a discriminator identifying whether the
           report is for a post or comment. Since the ICommunityPlatformReport.ICreate
           type is any, we simulate the minimal report data with contentType.
    
           Use 'post' as default contentType in this test for consistency.
        */
    contentType: "post",
    contentId: typia.random<string & tags.Format<"uuid">>(),
    communityPlatformCommunityId: community.id,
    reasonText: "Test report reason",
    description: "Detailed description for scenerio testing",
  };
  const report = await api.functional.communityPlatform.user.reports.create(
    authorizedUserConnection,
    { body: reportBody },
  );
  typia.assert(report);
  // 5. Scenario 1: List reports without filters
  const listResponse1 =
    await api.functional.communityPlatform.moderator.reports.index(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(listResponse1);
  // 6. Validate pagination in scenario 1
  TestValidator.predicate(
    "pagination has current page",
    typeof listResponse1.pagination.current === "number" &&
      listResponse1.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof listResponse1.pagination.limit === "number" &&
      listResponse1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has total records",
    typeof listResponse1.pagination.records === "number" &&
      listResponse1.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof listResponse1.pagination.pages === "number" &&
      listResponse1.pagination.pages > 0,
  );
  // Validate each report belongs to moderated communities and contains proper fields
  for (const item of listResponse1.data) {
    TestValidator.predicate(
      "report belongs to moderated communities",
      item.reportedContents_count > 0 &&
        item.status !== undefined &&
        item.user !== undefined &&
        item.reportReason !== undefined,
    );
  }
  // Validate sorting by createdAt descending
  for (let i = 1; i < listResponse1.data.length; i++) {
    const prev = listResponse1.data[i - 1];
    const curr = listResponse1.data[i];
    TestValidator.predicate(
      "sorted by createdAt descending",
      prev.created_at >= curr.created_at,
    );
  }
  // Scenario 2: List reports filtered by contentType and status
  const filters = [
    { contentType: "post", status: "pending" },
    { contentType: "post", status: "approved" },
    { contentType: "post", status: "dismissed" },
    { contentType: "comment", status: "pending" },
    { contentType: "comment", status: "approved" },
    { contentType: "comment", status: "dismissed" },
  ] as const;
  for (const filter of filters) {
    const response =
      await api.functional.communityPlatform.moderator.reports.index(
        moderatorConnection,
        { body: { contentType: filter.contentType, status: filter.status } },
      );
    typia.assert(response);
    // Validate pagination
    TestValidator.predicate(
      "pagination has current page",
      typeof response.pagination.current === "number" &&
        response.pagination.current > 0,
    );
    TestValidator.predicate(
      "pagination has limit",
      typeof response.pagination.limit === "number" &&
        response.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination has records",
      typeof response.pagination.records === "number" &&
        response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination has pages",
      typeof response.pagination.pages === "number" &&
        response.pagination.pages >= 0,
    );
    // Validate response data status
    for (const report of response.data) {
      TestValidator.equals("status filter", report.status, filter.status);
    }
  }
  // Scenario 3: Filter with no matching reports
  const noMatchResponse =
    await api.functional.communityPlatform.moderator.reports.index(
      moderatorConnection,
      {
        body: {
          contentType: "comment",
          status: "approved",
          communityPlatformCommunityId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  typia.assert(noMatchResponse);
  // Validate pagination indicates zero records
  TestValidator.equals(
    "no match records count",
    noMatchResponse.pagination.records,
    0,
  );
  TestValidator.equals("no match data length", noMatchResponse.data.length, 0);
}
