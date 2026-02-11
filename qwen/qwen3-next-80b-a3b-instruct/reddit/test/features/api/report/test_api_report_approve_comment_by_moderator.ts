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

export async function test_api_report_approve_comment_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const authResponse = await authorize_community_moderator_join(
    moderatorConnection,
    { body: moderatorCredentials },
  );
  // Create a new connection with updated headers from authentication response
  const authenticatedModeratorConnection: api.IConnection = {
    host: moderatorConnection.host,
    headers: { Authorization: `Bearer ${authResponse.access_token}` },
  };
  // 2. Use authenticated connection to fetch pending reports
  const randomCommunityId = typia.random<string & tags.Format<"uuid">>();
  const reportsResponse =
    await api.functional.redditCommunity.communityModerator.communities.reports.index(
      authenticatedModeratorConnection,
      { communityId: randomCommunityId },
    );
  typia.assert(reportsResponse);
  // 3. Find a pending report
  const pendingReport = reportsResponse.data.find(
    (report) => report.status === "pending",
  );
  // If no pending report exists, the test should fail as it's testing a real system state
  // We cannot create fake reports - we must test with actual data
  TestValidator.predicate("pending report exists", pendingReport !== undefined);
  // 4. Approve the report
  const approveResponse =
    await api.functional.redditCommunity.communityModerator.communities.reports.approve(
      authenticatedModeratorConnection,
      {
        communityId: randomCommunityId,
        reportId: pendingReport!.id,
      },
    );
  typia.assert(approveResponse);
  // 5. Validate the approval result
  TestValidator.equals(
    "report status is approved",
    approveResponse.status,
    "approved",
  );
  // Ensure resolved_at is not null by checking it directly
  TestValidator.predicate(
    "resolved_at is set",
    approveResponse.resolved_at !== null,
  );
  TestValidator.equals(
    "report id matches",
    approveResponse.id,
    pendingReport!.id,
  );
  TestValidator.equals(
    "comment_id matches",
    approveResponse.comment_id,
    pendingReport!.comment_id,
  );
  TestValidator.equals(
    "reporter_id matches",
    approveResponse.reporter_id,
    pendingReport!.reporter_id,
  );
  TestValidator.equals(
    "reason matches",
    approveResponse.reason,
    pendingReport!.reason,
  );
  TestValidator.predicate(
    "created_at unchanged",
    approveResponse.created_at === pendingReport!.created_at,
  );
}
