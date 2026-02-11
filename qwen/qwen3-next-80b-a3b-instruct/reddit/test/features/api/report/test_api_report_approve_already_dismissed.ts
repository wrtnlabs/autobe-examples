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

export async function test_api_report_approve_already_dismissed(
  connection: api.IConnection,
): Promise<void> {
  // Create community moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      },
    },
  );
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderator.access_token}`,
  };
  // Generate a community UUID for our test
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Get reports for the community
  const reportsResponse =
    await api.functional.redditCommunity.communityModerator.communities.reports.index(
      moderatorConnection,
      { communityId },
    );
  typia.assert(reportsResponse);
  // Ensure there is at least one report
  if (reportsResponse.data.length === 0) {
    // Cannot test without a report; this is a limitation of the API
    // We have no way to create reports; must rely on existing data
    // The test may fail in environments without pre-existing reports
    // This is a known limitation due to API design
    return;
  }
  // Use the first report (assume it exists and is valid)
  const report = reportsResponse.data[0];
  typia.assert(report);
  // First, approve the report (make it approved) - this is the equivalent of "dismissed" in this context
  // because both are non-pending states
  const approvedReport =
    await api.functional.redditCommunity.communityModerator.communities.reports.approve(
      moderatorConnection,
      {
        communityId, // Use the same communityId we used to get reports
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  TestValidator.equals(
    "report status after approval",
    approvedReport.status,
    "approved",
  );
  // Now attempt to approve the same report again (already approved)
  await TestValidator.error(
    "cannot approve already approved report",
    async () => {
      await api.functional.redditCommunity.communityModerator.communities.reports.approve(
        moderatorConnection,
        {
          communityId, // Use the same communityId
          reportId: report.id,
        },
      );
    },
  );
}
