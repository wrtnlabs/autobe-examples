import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_community_reports_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner (member) and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityMember.IJoin,
    });
  // 2. Create community as member owner
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create community moderator and authenticate
  const modConnection: api.IConnection = { host: connection.host };
  const modAuth: IRedditCommunityCommunityModerator.IAuthorized =
    await authorize_community_moderator_join(modConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    });
  typia.assert(modAuth);
  // 4. Link moderator to community (simulated in backend by join)
  // Since moderator join creates the relationship in backend per schema
  // 5. Create two reports from member on posts in the community
  // First report - will be approved
  const report1 = await generate_random_reddit_community_member_reports_create(
    memberConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report1);
  // Second report - will be dismissed
  const report2 = await generate_random_reddit_community_member_reports_create(
    memberConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report2);
  // 6. Approve first report using moderator connection
  const approvedReport =
    await api.functional.redditCommunity.communityModerator.reports.approve(
      modConnection,
      { reportId: report1.id },
    );
  typia.assert(approvedReport);
  TestValidator.equals(
    "report status should be approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.equals(
    "report resolved by should be moderator",
    approvedReport.resolved_by_user?.username,
    modAuth.username,
  );
  // 7. Dismiss second report using moderator connection
  const dismissedReport =
    await api.functional.redditCommunity.communityModerator.reports.dismiss(
      modConnection,
      { reportId: report2.id },
    );
  typia.assert(dismissedReport);
  TestValidator.equals(
    "report status should be dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "report resolved by should be moderator",
    dismissedReport.resolved_by_user?.username,
    modAuth.username,
  );
  // 8. Test filtering reports by status
  // 8a) Filter for pending - should be 0
  const pendingReports =
    await api.functional.redditCommunity.communityModerator.communities.reports.index(
      modConnection,
      {
        communityId: community.id,
        body: {
          status: "pending",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  TestValidator.equals("pending reports count", pendingReports.data.length, 0);
  // 8b) Filter for approved - should be 1
  const approvedReports =
    await api.functional.redditCommunity.communityModerator.communities.reports.index(
      modConnection,
      {
        communityId: community.id,
        body: {
          status: "approved",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(approvedReports);
  TestValidator.equals(
    "approved reports count",
    approvedReports.data.length,
    1,
  );
  TestValidator.equals(
    "approved report status",
    approvedReports.data[0].status,
    "approved",
  );
  TestValidator.equals(
    "approved report resolved by",
    approvedReports.data[0].resolved_by_username,
    modAuth.username,
  );
  // 8c) Filter for dismissed - should be 1
  const dismissedReports =
    await api.functional.redditCommunity.communityModerator.communities.reports.index(
      modConnection,
      {
        communityId: community.id,
        body: {
          status: "dismissed",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(dismissedReports);
  TestValidator.equals(
    "dismissed reports count",
    dismissedReports.data.length,
    1,
  );
  TestValidator.equals(
    "dismissed report status",
    dismissedReports.data[0].status,
    "dismissed",
  );
  TestValidator.equals(
    "dismissed report resolved by",
    dismissedReports.data[0].resolved_by_username,
    modAuth.username,
  );
  // 9. Final validation: all three statuses are handled correctly
  TestValidator.predicate("All tests passed", true);
}
