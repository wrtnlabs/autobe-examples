import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReportTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTracking";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_report_tracking_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Call the report tracking endpoint with a valid UUID
  // We cannot create reports (no API endpoint provided for reporting) so we test the endpoint with a random UUID
  const trackingId = typia.random<string & tags.Format<"uuid">>();
  const reportTracking =
    await api.functional.communityPlatform.member.report.tracking.at(
      adminConnection,
      {
        trackingId,
      },
    );
  // Step 3: Validate response type matches the expected interface
  typia.assert(reportTracking);
  // Step 4: Validate that the response has the correct schema structure (without hardcoding values)
  // The report tracking should follow the ICommunityPlatformReportTracking schema exactly
  // Since we cannot create real report tracking data (no API to trigger reports),
  // we validate type safety and that the endpoint returns the expected response structure
  // Removed: TestValidator.equals("trackingId matches request", reportTracking.trackingId, trackingId);
  // because 'trackingId' does not exist on ICommunityPlatformReportTracking
  // Validate that fields exist with correct types
  TestValidator.predicate(
    "report_id is a UUID",
    typeof reportTracking.report_id === "string" &&
      reportTracking.report_id.length === 36,
  );
  TestValidator.predicate(
    "reported_content_type is valid",
    [
      "post",
      "comment",
      "message",
      "product_review",
      "question",
      "answer",
    ].includes(reportTracking.reported_content_type),
  );
  TestValidator.predicate(
    "status is valid",
    ["pending", "reviewed", "dismissed", "action_taken", "resolved"].includes(
      reportTracking.status,
    ),
  );
  TestValidator.predicate(
    "moderation_actions is array of valid types",
    Array.isArray(reportTracking.moderation_actions) &&
      reportTracking.moderation_actions.every((action) =>
        [
          "content_removed",
          "user_warning",
          "user_suspension",
          "user_ban",
          "content_hidden",
          "content_aged",
          "added_tag",
          "reopened",
          "no_action",
        ].includes(action),
      ),
  );
  TestValidator.predicate(
    "resolution_comment is optional",
    reportTracking.resolution_comment === undefined ||
      (typeof reportTracking.resolution_comment === "string" &&
        reportTracking.resolution_comment.length <= 5000),
  );
  TestValidator.predicate(
    "child_report_count is optional",
    reportTracking.child_report_count === undefined ||
      (typeof reportTracking.child_report_count === "number" &&
        reportTracking.child_report_count >= 0 &&
        reportTracking.child_report_count <= 1000),
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof reportTracking.created_at === "string" &&
      !isNaN(Date.parse(reportTracking.created_at)),
  );
  TestValidator.predicate(
    "reported_by_actor_id is UUID",
    typeof reportTracking.reported_by_actor_id === "string" &&
      reportTracking.reported_by_actor_id.length === 36,
  );
  TestValidator.predicate(
    "initial_assessment is string",
    typeof reportTracking.initial_assessment === "string",
  );
  TestValidator.predicate(
    "assigned_moderator_id is UUID",
    typeof reportTracking.assigned_moderator_id === "string" &&
      reportTracking.assigned_moderator_id.length === 36,
  );
  TestValidator.predicate(
    "notes is string",
    typeof reportTracking.notes === "string",
  );
}
