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

export async function test_api_community_moderator_pending_reports_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // 2. Use a generated communityId. Since we cannot create a community via provided API,
  //    we assume a valid community exists and has pending reports.
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve pending reports for the community
  const reports =
    await api.functional.redditCommunity.communityModerator.communities.reports.index(
      moderatorConnection,
      {
        communityId,
      },
    );
  typia.assert(reports);
  // 4. Validate pagination structure
  TestValidator.equals("pagination current", reports.pagination.current, 1);
  TestValidator.equals("pagination limit", reports.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records >= 0",
    () => reports.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    () => reports.pagination.pages >= 0,
  );
  // 5. Validate that each report has the correct structure
  // Since we cannot control report creation, we validate the structure only
  for (const report of reports.data) {
    TestValidator.equals("report status is pending", report.status, "pending");
    TestValidator.equals("report has uuid id", typeof report.id, "string");
    TestValidator.equals("report has reason", typeof report.reason, "string");
    TestValidator.equals(
      "report has comment_id",
      typeof report.comment_id,
      "string",
    );
    TestValidator.equals(
      "report has reporter_id",
      typeof report.reporter_id,
      "string",
    );
    TestValidator.equals(
      "report has created_at",
      typeof report.created_at,
      "string",
    );
  }
}
