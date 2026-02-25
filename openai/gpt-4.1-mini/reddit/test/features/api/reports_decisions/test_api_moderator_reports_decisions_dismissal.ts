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

export async function test_api_moderator_reports_decisions_dismissal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
      avatarUrl: null,
    },
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Prepare a report dismissal decision
  //    - We must create a report decision on an existing report ID
  //    - Since we don't have a separate report creation util, use generate_random_community_platform_moderator_reports_decisions_create_report_decision with status 'dismissed'
  // Create the dismissal decision by generate function, explicitly specify 'dismissed' status
  const dismissalDecision =
    await generate_random_community_platform_moderator_reports_decisions_create_report_decision(
      moderatorConnection,
      {
        body: {
          status: "dismissed",
        },
      },
    );
  typia.assert(dismissalDecision);
  // 3. Verify the dismissal decision
  TestValidator.equals(
    "decision status",
    dismissalDecision.decision,
    "dismissed",
  );
  // The report associated with the decision should remain intact (not deleted)
  typia.assert(dismissalDecision.report);
  TestValidator.predicate(
    "reported contents count >= 0",
    dismissalDecision.report.reportedContents_count >= 0,
  );
  TestValidator.equals(
    "decision moderator id matches",
    dismissalDecision.moderator_id,
    moderatorAuth.id,
  );
  // 4. Validate that the report is no longer active in pending reports
  // Assuming that the dismissal removes the report from active lists
  // Here we check that the report status is updated accordingly (not 'active')
  TestValidator.predicate(
    "report status is not pending",
    dismissalDecision.report.status !== "pending" &&
      dismissalDecision.report.status !== "open",
  );
}
