import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_moderator_reports_decisions_create_report_decision } from "../../../generate/generate_random_community_platform_moderator_reports_decisions_create_report_decision";
import { prepare_random_community_platform_reports_decision } from "../../../prepare/prepare_random_community_platform_reports_decision";

export async function test_api_moderator_reports_decisions_report_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new moderator and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(moderatorJoin);
  // Set authorization header with the token
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorJoin.token.access}`,
  };
  // 2. Attempt to create a report decision with a non-existent report ID
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();
  const decisionBody: ICommunityPlatformReportsDecision.ICreate = {
    reportId: nonExistentReportId,
    status: "approved",
    comment: "Attempt to approve a non-existent report",
  };
  // 3. Expect an error (404) indicating report not found
  await TestValidator.httpError(
    "should fail when report ID does not exist",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.reports_decisions.createReportDecision(
        moderatorConnection,
        { body: decisionBody },
      );
    },
  );
}
