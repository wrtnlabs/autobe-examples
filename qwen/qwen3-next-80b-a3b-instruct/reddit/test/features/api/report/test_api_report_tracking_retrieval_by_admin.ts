import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportMetadata";
import type { ICommunityPlatformReportTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTracking";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { generate_random_community_platform_admin_reports_create } from "../../../generate/generate_random_community_platform_admin_reports_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_report_tracking_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a system report to generate a valid reportId for retrieval testing
  // The API response includes an 'id' field even though it's not defined in ICommunityPlatformReport schema
  // We use satisfies to tell TypeScript this object also has an id property
  const report: ICommunityPlatformReport & {
    id: string;
  } = (await generate_random_community_platform_admin_reports_create(
    adminConnection,
    {
      body: {
        event_type: "content_flag",
        severity: "high",
        content_identifier: typia.random<string & tags.Format<"uuid">>(),
        related_user_id: typia.random<string & tags.Format<"uuid">>(),
        report_description:
          "User posted inappropriate content in community forum",
        system_source: "spam_detector_v3",
        metadata: "{}",
        action_taken: true,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  )) as ICommunityPlatformReport & {
    id: string;
  };
  typia.assert(report);
  // Step 3: Retrieve the report tracking record using the report's ID as trackingId
  const tracking: ICommunityPlatformReportTracking =
    await api.functional.communityPlatform.admin.report.tracking.at(
      adminConnection,
      {
        trackingId: report.id,
      },
    );
  typia.assert(tracking);
  // Step 4: Validate the retrieved tracking record with logical business validation
  TestValidator.equals(
    "tracking report_id matches the created report's ID",
    tracking.report_id,
    report.id,
  );
  TestValidator.equals(
    "reported_by_actor_id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      tracking.reported_by_actor_id,
    ),
    true,
  );
  TestValidator.equals(
    "assigned_moderator_id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      tracking.assigned_moderator_id,
    ),
    true,
  );
  TestValidator.equals("notes is not empty", tracking.notes.length > 0, true);
  TestValidator.equals(
    "created_at is a valid date-time string",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(?:Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
      tracking.created_at,
    ),
    true,
  );
  TestValidator.predicate(
    "initial_assessment is a non-empty string",
    typeof tracking.initial_assessment === "string" &&
      tracking.initial_assessment.length > 0,
  );
  TestValidator.equals("status is properly set", tracking.status, "pending");
  TestValidator.equals(
    "priority_level is properly set",
    tracking.priority_level,
    "high",
  );
  TestValidator.equals(
    "moderation_actions array is not empty",
    tracking.moderation_actions.length > 0,
    true,
  );
  TestValidator.equals(
    "resolution_comment is present",
    tracking.resolution_comment !== undefined &&
      tracking.resolution_comment.length > 0,
    true,
  );
}
