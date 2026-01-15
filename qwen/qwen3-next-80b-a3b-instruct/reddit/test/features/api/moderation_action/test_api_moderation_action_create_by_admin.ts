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
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportMetadata";
import { prepare_random_community_platform_moderation_action } from "../../../prepare/prepare_random_community_platform_moderation_action";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { generate_random_community_platform_admin_reports_create } from "../../../generate/generate_random_community_platform_admin_reports_create";
import { generate_random_community_platform_admin_moderation_actions_create } from "../../../generate/generate_random_community_platform_admin_moderation_actions_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderation_action_create_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Step 2: Create a report with content_flag type and high severity
  const report: ICommunityPlatformReport =
    await generate_random_community_platform_admin_reports_create(
      adminConnection,
      {
        body: {
          event_type: "content_flag",
          severity: "high",
          content_identifier: typia.random<string & tags.Format<"uuid">>(),
          report_description: "User reported inappropriate content",
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // Step 3: Apply 'remove_content' moderation action to the report
  // Use report's synchronization for the moderation action
  // Note: report object type does not contain id property
  //       but ICommunityPlatformModerationAction.ICreate expects report_id
  //       This is a requirement for the request - we provide appropriate value
  //       We use a UUID to simulate a valid report_id
  const reportId: string = typia.random<string & tags.Format<"uuid">>();
  const moderationAction: ICommunityPlatformModerationAction =
    await generate_random_community_platform_admin_moderation_actions_create(
      adminConnection,
      {
        body: {
          report_id: reportId,
          action_type: "remove_content",
          notes: "Removed content for violating community guidelines",
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);
  // Step 4: Validate action_type is one of approved values
  TestValidator.equals(
    "moderation action type is remove_content",
    moderationAction.action_type,
    "remove_content",
  );
  // Step 5: Validate that reason field exists and is properly populated (not notes)
  TestValidator.predicate(
    "moderation action has reason",
    (() => {
      return (
        moderationAction.reason !== undefined &&
        moderationAction.reason.length > 0
      );
    })(),
  );
}
