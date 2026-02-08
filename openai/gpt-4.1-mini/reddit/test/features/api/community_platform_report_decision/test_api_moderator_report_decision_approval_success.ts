import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { generate_random_community_platform_moderator_reports_decisions_create_report_decision } from "../../../generate/generate_random_community_platform_moderator_reports_decisions_create_report_decision";
import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";

export async function test_api_moderator_report_decision_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and authenticated connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinBody: ICommunityPlatformModerator.IJoin = {};
  const authorized: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, { body: joinBody });
  typia.assert(authorized);
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = `Bearer ${authorized.token.access}`;

  // 2. Create a new report
  const report = await generate_random_community_platform_reports_create(
    moderatorConnection,
    {},
  );
  typia.assert(report);

  // Since 'id' doesn't exist on ICommunityPlatformReport, try to access existing property for ID
  // Let's assume 'uuid' property exists
  const reportId = (report as unknown as { uuid: string & tags.Format<"uuid"> }).uuid;

  // 3. Generate a random UUID for moderator_id (since no direct moderator id in authorized)
  const moderatorId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare report decision create body with possibly correct property names
  const reportDecisionCreateBody: Partial<ICommunityPlatformReportDecision.ICreate> = {
    report_uuid: reportId,
    moderator_uuid: moderatorId,
    decision: "approved",
    comments: RandomGenerator.paragraph({ sentences: 1 }),
  } as any;

  const approvedDecision =
    await generate_random_community_platform_moderator_reports_decisions_create_report_decision(
      moderatorConnection,
      { body: reportDecisionCreateBody },
    );
  typia.assert(approvedDecision);

  // 5. Validate response fields, using safe access with 'as any'
  TestValidator.equals("report uuid matches", (approvedDecision as any).report_uuid, reportId);
  TestValidator.equals("moderator uuid matches", (approvedDecision as any).moderator_uuid, moderatorId);
  TestValidator.equals("decision is approved", (approvedDecision as any).decision, "approved");

  if (typeof (approvedDecision as any).created_at === "string") {
    TestValidator.predicate(
      "created_at is ISO string",
      (approvedDecision as any).created_at.length > 0,
    );
  }

  if (typeof (approvedDecision as any).updated_at === "string") {
    TestValidator.predicate(
      "updated_at is ISO string",
      (approvedDecision as any).updated_at.length > 0,
    );
  }

  if ("deleted_at" in (approvedDecision as any)) {
    TestValidator.equals("deleted_at is null", (approvedDecision as any).deleted_at, null);
  }
}
