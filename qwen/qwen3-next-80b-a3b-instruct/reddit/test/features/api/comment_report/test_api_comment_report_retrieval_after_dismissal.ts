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

export async function test_api_comment_report_retrieval_after_dismissal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new community moderator account
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
  typia.assert(moderator);
  // 2. Retrieve a comment report (assumed to exist in test environment)
  // Generate a random report ID—assume one exists with status=dismissed
  const reportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call the endpoint to retrieve the report
  const report =
    await api.functional.redditCommunity.communityModerator.reports.at(
      moderatorConnection,
      { reportId },
    );
  typia.assert(report);
  // 4. Validate the report structure and content
  TestValidator.equals(
    "report status is dismissed",
    report.status,
    "dismissed",
  );
  TestValidator.notEquals("resolved_at is populated", report.resolved_at, null);
  TestValidator.notEquals(
    "resolved_at is populated",
    report.resolved_at,
    undefined,
  );
  TestValidator.predicate("resolved_at is a valid date-time", () => {
    if (!report.resolved_at) return false;
    const date = new Date(report.resolved_at);
    return !isNaN(date.getTime());
  });
}
