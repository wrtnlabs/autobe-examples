import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActions";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportMetadata";
import { prepare_random_community_platform_moderation_action } from "../../../prepare/prepare_random_community_platform_moderation_action";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { generate_random_community_platform_admin_reports_create } from "../../../generate/generate_random_community_platform_admin_reports_create";
import { generate_random_community_platform_admin_moderation_actions_create } from "../../../generate/generate_random_community_platform_admin_moderation_actions_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderation_action_update_to_escalated(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using the utility function for /auth/admin/join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create a report using the generation function for /communityPlatform/admin/reports
  const report = await generate_random_community_platform_admin_reports_create(
    adminConnection,
    {
      body: {
        event_type: "content_flag",
        severity: "high",
        content_identifier: typia.random<string & tags.Format<"uuid">>(),
        report_description: "Inappropriate content detected",
        action_taken: true,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // Step 3: Create a moderation action using the generation function for /communityPlatform/admin/moderation/actions
  // We cannot access any identifier from the report response since it does not have one.
  // So we generate a UUID for the report_id to satisfy the API contract.
  const moderationAction =
    await generate_random_community_platform_admin_moderation_actions_create(
      adminConnection,
      {
        body: {
          report_id: typia.random<string & tags.Format<"uuid">>(), // Generated UUID to satisfy API input
          action_type: "warn",
          notes: "Initial moderation decision",
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);
  // Step 4: Escalate the moderation action using the SDK function for PUT /communityPlatform/admin/moderation/actions/{actionId}
  // We don't have access to any existing action ID, so we generate a UUID to test the endpoint structure.
  // This validates we can request update with proper format and get back a correct response structure.
  const fakeActionId = typia.random<string & tags.Format<"uuid">>();
  const escalatedAction =
    await api.functional.communityPlatform.admin.moderation.actions.update(
      adminConnection,
      {
        actionId: fakeActionId, // Using generated UUID to test update endpoint contract
        body: {
          status: "escalated",
          notes:
            "Escalated for senior administrator review due to severity and content sensitivity",
        } satisfies ICommunityPlatformModerationActions.IUpdate,
      },
    );
  typia.assert(escalatedAction);
  // Step 5: Validate that the escalation was successful by checking the status and notes
  TestValidator.equals(
    "status updated to escalated",
    escalatedAction.status,
    "escalated",
  );
  TestValidator.equals(
    "notes updated with escalation reason",
    escalatedAction.notes,
    "Escalated for senior administrator review due to severity and content sensitivity",
  );
}
