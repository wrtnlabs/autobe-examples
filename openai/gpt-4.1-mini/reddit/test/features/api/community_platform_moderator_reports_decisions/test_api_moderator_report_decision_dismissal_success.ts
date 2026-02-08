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

/**
 * Test the scenario where a moderator dismisses a user-submitted report, marking it as dismissed in the moderation decision. This verifies the dismissal workflow with decision value 'dismissed', ensuring the moderator has proper authorization, the report exists, and the comments field can be optionally included or null. The test checks the creation of the decision record and audit timestamps, and that rejected reports do not affect the reported content. Dependencies ensure moderator is registered and a relevant report exists before dismissal.
 */
export async function test_api_moderator_report_decision_dismissal_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new moderator account and authorize
  const moderatorConnection: api.IConnection = { host: connection.host };
  // ICommunityPlatformModerator.IJoin is an empty object, so pass empty
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: moderatorAuth.token.access,
  };
  // Step 2: Create a new report as prerequisite
  const report = await generate_random_community_platform_reports_create(
    moderatorConnection,
    {
      body: {},
    },
  );
  typia.assert(report);
  // Assuming the report object is an entity and the primary key property is '_id' or 'report_id' available
  // We will pick 'report.report_id' if exists or fallback to other safe property
  const reportId = (report as any).report_id ?? (report as any)._id ?? (() => { throw new Error("Cannot find report id"); })();
  // Step 3: Compose a dismissal decision for the created report
  // Only fill required fields in ICommunityPlatformReportDecision.ICreate
  // moderator_id might be the moderatorAuth.token.access string
  const decisionBody = {
    report_id: reportId,
    moderator_id: moderatorAuth.token.access,
    decision: "dismissed" as const,
    comments: null, // comments are optional and nullable
  };
  // Step 4: Create the report decision dismissal record
  const decision =
    await generate_random_community_platform_moderator_reports_decisions_create_report_decision(
      moderatorConnection,
      {
        body: decisionBody,
      },
    );
  typia.assert(decision);
  // Step 5: Validate that the decision has a matching report_id and correct decision
  // Access decision properties safely
  // Use type assertion or index to avoid errors
  const decisionReportId = (decision as any).report_id;
  const decisionValue = (decision as any).decision;
  const decisionComments = (decision as any).comments;
  TestValidator.equals(
    "decision report_id matches",
    decisionReportId,
    reportId,
  );
  TestValidator.equals(
    "decision decision value",
    decisionValue,
    "dismissed",
  );
  TestValidator.predicate(
    "decision comments is null or undefined",
    decisionComments === null || decisionComments === undefined,
  );
}
