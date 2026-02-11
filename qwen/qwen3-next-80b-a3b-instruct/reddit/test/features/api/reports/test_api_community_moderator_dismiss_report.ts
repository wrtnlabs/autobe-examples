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

export async function test_api_community_moderator_dismiss_report(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create & authenticate a community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const moderatorAuth = await authorize_community_moderator_join(
    moderatorConnection,
    { body: moderatorData },
  );
  // 2. Generate valid, random IDs for a community and a pending report (assume these exist in system)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Dismiss the report
  const dismissedReport =
    await api.functional.redditCommunity.communityModerator.communities.reports.dismiss(
      moderatorConnection,
      {
        communityId,
        reportId,
      },
    );
  typia.assert(dismissedReport);
  // 4. Validate the response
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.predicate(
    "resolved_at is set and is a valid date-time",
    dismissedReport.resolved_at !== null &&
      typeof dismissedReport.resolved_at === "string" &&
      !isNaN(new Date(dismissedReport.resolved_at).getTime()),
  );
}
