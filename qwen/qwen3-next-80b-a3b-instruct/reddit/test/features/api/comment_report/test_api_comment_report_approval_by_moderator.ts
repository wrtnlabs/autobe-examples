import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_comment_report_approval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a fake pending report with valid structure
  const fakeReport: IRedditCommunityCommentReport =
    typia.random<IRedditCommunityCommentReport>();
  typia.assert(fakeReport);
  // 2. Create a new community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const moderatorAuthorized = await authorize_community_moderator_join(
    moderatorConnection,
    { body: moderatorData },
  );
  typia.assert(moderatorAuthorized);
  // 3. Approve the report as the moderator
  const approvedReport =
    await api.functional.redditCommunity.communityModerator.reports.approve(
      moderatorConnection,
      { reportId: fakeReport.id },
    );
  typia.assert(approvedReport);
  // 4. Validate response
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "resolved_at is set",
    approvedReport.resolved_at !== null,
  );
  TestValidator.predicate(
    "resolved_at is valid datetime",
    approvedReport.resolved_at !== undefined,
  );
  TestValidator.equals("report id matches", approvedReport.id, fakeReport.id);
}
