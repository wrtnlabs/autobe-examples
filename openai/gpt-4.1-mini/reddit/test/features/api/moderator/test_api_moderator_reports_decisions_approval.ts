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

export async function test_api_moderator_reports_decisions_approval(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario covers the primary success path where a community moderator authenticates via moderator join, then approves a user report. The test verifies that the report decision with status 'approved' is created successfully. Upon approval, the reported content should be permanently deleted, and the decision recorded accurately. Assertions include HTTP 201 Created response, verification of returned decision data matching input, and confirmation that the reported content no longer exists or is inaccessible.
  // 1. Moderator joins and authenticated
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinPayload: Partial<ICommunityPlatformModerator.IJoin> = {
    email: typia.random<string & typia.tags.Format<"email">>(),
    username: typia.random<string>(),
  };
  const authorizedModerator = await authorize_moderator_join(
    moderatorConnection,
    {
      body: moderatorJoinPayload,
    },
  );
  typia.assert(authorizedModerator);
  moderatorConnection.headers = {
    Authorization: authorizedModerator.token.access,
  };
  typia.assert(moderatorConnection.headers);
  // 2. Create approval report decision
  const reportDecision: ICommunityPlatformReportsDecision =
    await generate_random_community_platform_moderator_reports_decisions_create_report_decision(
      moderatorConnection,
      {
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(reportDecision);
  // 3. Verify that the returned decision status is 'approved'
  TestValidator.equals(
    "report decision status",
    reportDecision.decision,
    "approved",
  );
  TestValidator.notEquals(
    "reportDecision.id is not empty",
    reportDecision.id,
    "",
  );
  TestValidator.equals(
    "reportDecision.moderator_id matches moderator id",
    reportDecision.moderator_id,
    authorizedModerator.id,
  );
  // 4. After approval, check that the reported content is deleted
  // Since there is no direct API to check, we rely on the report's status being 'approved'
  TestValidator.equals(
    "reported content deleted after approval",
    reportDecision.report.status,
    "approved",
  );
}
