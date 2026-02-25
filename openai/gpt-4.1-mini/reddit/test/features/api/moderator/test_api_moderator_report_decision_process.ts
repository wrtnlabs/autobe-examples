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

export async function test_api_moderator_report_decision_process(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<string>(),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
    },
  });
  typia.assert(moderatorAuth);
  const authConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: moderatorAuth.token.access },
  };
  // 2. Scenario 1: Try approving a report with a random reportId (likely not existing)
  // Since no API to create a report is given, we test business logic with fresh reportId
  const approveReportId = typia.random<string & tags.Format<"uuid">>();
  const approveComment = RandomGenerator.paragraph({ sentences: 1 });
  // We expect an error because report does not exist
  await TestValidator.error(
    "approve decision with non-existent reportId should fail",
    async () => {
      await api.functional.communityPlatform.moderator.reports_decisions.updateDecision(
        authConnection,
        {
          body: {
            reportId: approveReportId,
            decision: "approve",
            comment: approveComment,
          },
        },
      );
    },
  );
  // 3. Scenario 2: Try dismissing a report with a random reportId (likely not existing)
  const dismissReportId = typia.random<string & tags.Format<"uuid">>();
  const dismissComment = RandomGenerator.paragraph({ sentences: 1 });
  // We expect an error because report does not exist
  await TestValidator.error(
    "dismiss decision with non-existent reportId should fail",
    async () => {
      await api.functional.communityPlatform.moderator.reports_decisions.updateDecision(
        authConnection,
        {
          body: {
            reportId: dismissReportId,
            decision: "dismiss",
            comment: dismissComment,
          },
        },
      );
    },
  );
  // 4. Scenario 3: Attempt decision submission with non-existent reportId
  const fakeReportId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "decision submission with non-existent reportId should error",
    async () => {
      await api.functional.communityPlatform.moderator.reports_decisions.updateDecision(
        authConnection,
        {
          body: {
            reportId: fakeReportId,
            decision: "approve",
            comment: null,
          },
        },
      );
    },
  );
}
