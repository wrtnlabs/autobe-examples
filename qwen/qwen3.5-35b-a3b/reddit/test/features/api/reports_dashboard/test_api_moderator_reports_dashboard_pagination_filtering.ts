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

export async function test_api_moderator_reports_dashboard_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorizedMember);
  // 2. Create a community for the member to moderate
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Assign the member as moderator to the community
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAssignment =
    await generate_random_reddit_platform_member_communities_moderators_create(
      memberConnection,
      {
        body: {
          user_id: authorizedMember.user.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 4. Test pagination: page=2, limit=30
  const paginationConnection: api.IConnection = { host: connection.host };
  const paginationBody = {
    page: 2,
    limit: 30,
  } satisfies IRedditPlatformReport.IRequest;
  const paginationResult =
    await api.functional.redditPlatform.member.reports.dashboard.index(
      paginationConnection,
      {
        body: paginationBody,
      },
    );
  typia.assert(paginationResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    30,
  );
  TestValidator.predicate(
    "pagination records count",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    paginationResult.pagination.pages >= paginationResult.pagination.current,
  );
  // 5. Test date range filtering
  const dateRangeConnection: api.IConnection = { host: connection.host };
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = thirtyDaysAgo.toISOString();
  const endDate = now.toISOString();
  const dateRangeBody = {
    startDate,
    endDate,
  } satisfies IRedditPlatformReport.IRequest;
  const dateRangeResult =
    await api.functional.redditPlatform.member.reports.dashboard.index(
      dateRangeConnection,
      {
        body: dateRangeBody,
      },
    );
  typia.assert(dateRangeResult);
  // 6. Validate date range filtering results
  TestValidator.equals(
    "date range pagination current",
    dateRangeResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "date range has valid records",
    dateRangeResult.pagination.records >= 0,
  );
  // 7. Validate reports are sorted by created_at descending (newest first)
  if (dateRangeResult.data.length > 1) {
    for (let i = 1; i < dateRangeResult.data.length; i++) {
      const prevDate = new Date(
        dateRangeResult.data[i - 1].created_at,
      ).getTime();
      const currDate = new Date(dateRangeResult.data[i].created_at).getTime();
      TestValidator.predicate(
        `report ${i} is newer than or equal to report ${i - 1}`,
        currDate <= prevDate,
      );
    }
  }
  // 8. Validate all returned reports are within date range
  const minDate = new Date(startDate).getTime();
  const maxDate = new Date(endDate).getTime();
  for (const report of dateRangeResult.data) {
    const reportDate = new Date(report.created_at).getTime();
    TestValidator.predicate(
      "report created_at within date range",
      reportDate >= minDate && reportDate <= maxDate,
    );
  }
  // 9. Validate reports have correct community (the one we created)
  for (const report of dateRangeResult.data) {
    TestValidator.equals(
      "report community matches assigned",
      report.community.id,
      community.id,
    );
  }
}
