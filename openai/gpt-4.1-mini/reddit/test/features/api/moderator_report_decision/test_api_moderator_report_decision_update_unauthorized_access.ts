import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
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
import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_decision } from "../../../prepare/prepare_random_community_platform_report_decision";

export async function test_api_moderator_report_decision_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins the platform to get authorizedConnection
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(moderatorAuthorized);
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    Authorization: `Bearer ${moderatorAuthorized.token.access}`,
  };
  // 2. Moderator creates a report that will be decided on
  const report = await generate_random_community_platform_reports_create(
    authorizedConnection,
    {},
  );
  typia.assert(report);
  // 3. Moderator creates a report decision to be updated
  const reportDecisionRaw =
    await generate_random_community_platform_moderator_reports_decisions_create_report_decision(
      authorizedConnection,
      {
        body: {
          // cautiously leave body empty (DeepPartial, sample generator handles)
        },
      },
    );
  // Safely assert reportDecisionRaw to unknown and then to the type extended with id
  const reportDecision = reportDecisionRaw as ICommunityPlatformReportDecision & { id: string };
  typia.assert(reportDecision);
  // 4. Attempt to update the report decision *without* any authorization
  await TestValidator.httpError(
    "unauthorized access without auth token",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.reportsDecisions.updateReportDecision(
        { host: connection.host },
        {
          reportDecisionId: reportDecision.id,
          body: typia.random<ICommunityPlatformReportDecision.IUpdate>(),
        },
      );
    },
  );
  // 5. Attempt to update the report decision with a connection not authorized as moderator
  // For test purposes, simulate a user connection with no moderator rights
  // Here, just a fresh connection with no Authorization header
  await TestValidator.httpError(
    "unauthorized access with invalid token",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.reportsDecisions.updateReportDecision(
        {
          host: connection.host,
          headers: { Authorization: `Bearer invalid-token` },
        },
        {
          reportDecisionId: reportDecision.id,
          body: typia.random<ICommunityPlatformReportDecision.IUpdate>(),
        },
      );
    },
  );
}
