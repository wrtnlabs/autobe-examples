import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_moderator_reports_dashboard_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "password123",
      displayName: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  typia.assert(memberAuth.token);
  // Create new connection with member's token
  const memberSessionConnection: api.IConnection = { host: connection.host };
  memberSessionConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 2. Create a community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberSessionConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Add member as moderator to their own community (as owner)
  const moderatorAssignment =
    await api.functional.redditPlatform.member.communities.moderators.create(
      memberSessionConnection,
      {
        communityId: community.id,
        body: {
          user_id: memberAuth.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 4. Call dashboard endpoint to get pending reports
  const dashboardResponse =
    await api.functional.redditPlatform.member.reports.dashboard.index(
      memberSessionConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(dashboardResponse);
  // 5. Validate response structure
  TestValidator.equals(
    "dashboard response has pagination",
    dashboardResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "dashboard response has data array",
    Array.isArray(dashboardResponse.data),
    true,
  );
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination has current page",
    dashboardResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    dashboardResponse.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    dashboardResponse.pagination.records >= 0,
  );
  // 7. Validate each report in the response (if any exist)
  for (const report of dashboardResponse.data) {
    typia.assert(report);
    // Validate report has required fields
    TestValidator.equals(
      "report has UUID id",
      typeof report.id === "string",
      true,
    );
    TestValidator.equals(
      "report has reported_content_id",
      typeof report.reported_content_id === "string",
      true,
    );
    TestValidator.equals(
      "report has reported_content_type",
      ["POST", "COMMENT"].includes(report.reported_content_type),
      true,
    );
    TestValidator.equals(
      "report has reason",
      typeof report.reason === "string" && report.reason.length >= 10,
      true,
    );
    TestValidator.equals(
      "report has PENDING status",
      report.status === "PENDING",
      true,
    );
    // Validate reporter is present
    TestValidator.equals(
      "report has reporter",
      report.reporter !== undefined,
      true,
    );
    if (report.reporter) {
      TestValidator.equals(
        "reporter has id",
        typeof report.reporter.id === "string",
        true,
      );
      TestValidator.equals(
        "reporter has username",
        typeof report.reporter.username === "string",
        true,
      );
      TestValidator.equals(
        "reporter has display_name",
        typeof report.reporter.display_name === "string",
        true,
      );
    }
    // Validate community is present
    TestValidator.equals(
      "report has community",
      report.community !== undefined,
      true,
    );
    if (report.community) {
      TestValidator.equals(
        "community has id",
        typeof report.community.id === "string",
        true,
      );
      TestValidator.equals(
        "community has name",
        typeof report.community.name === "string",
        true,
      );
      TestValidator.equals(
        "community has subscriber_count",
        typeof report.community.subscriber_count === "number",
        true,
      );
    }
    // Validate timestamps
    TestValidator.equals(
      "report has created_at",
      typeof report.created_at === "string",
      true,
    );
    TestValidator.equals(
      "report has updated_at",
      typeof report.updated_at === "string",
      true,
    );
  }
  // 8. If there are reports, validate they are sorted by created_at descending
  if (dashboardResponse.data.length > 1) {
    for (let i = 0; i < dashboardResponse.data.length - 1; i++) {
      const currentReport = dashboardResponse.data[i];
      const nextReport = dashboardResponse.data[i + 1];
      TestValidator.predicate(
        "reports sorted by created_at descending",
        new Date(currentReport.created_at) >= new Date(nextReport.created_at),
      );
    }
  }
  // 9. Validate community matches the one where user is moderator
  for (const report of dashboardResponse.data) {
    TestValidator.equals(
      "report community matches moderator's community",
      report.community.id,
      community.id,
    );
  }
}