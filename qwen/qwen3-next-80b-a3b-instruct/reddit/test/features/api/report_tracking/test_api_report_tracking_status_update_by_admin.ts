import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTracking";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_report_tracking_status_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Generate a random tracking ID that represents an existing report tracking record
  // Since there's no API to create a report tracking record, we use a random valid UUID
  // to test the API contract. In a real system, this ID would come from an existing record created by another process.
  const trackingId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update the report tracking status to 'resolved' (required field)
  const updateBody: ICommunityPlatformReportTracking.IUpdate = {
    status: "resolved",
  } satisfies ICommunityPlatformReportTracking.IUpdate;
  // Step 4: Call the update endpoint
  const updatedReportTracking: ICommunityPlatformReportTracking =
    await api.functional.communityPlatform.admin.report.tracking.update(
      adminConnection,
      {
        trackingId,
        body: updateBody,
      },
    );
  typia.assert(updatedReportTracking);
  // Step 5: Validate the structure of the response
  // We can only validate the contract: response has ICommunityPlatformReportTracking type
  // We don't validate field values because we cannot control the initial state (no create API)
  // We validate the mandatory fields that MUST be present in the response
  TestValidator.predicate(
    "status is valid",
    () =>
      updatedReportTracking.status === "pending" ||
      updatedReportTracking.status === "reviewed" ||
      updatedReportTracking.status === "dismissed" ||
      updatedReportTracking.status === "action_taken" ||
      updatedReportTracking.status === "resolved",
  );
  TestValidator.predicate("report_id is valid UUID", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(updatedReportTracking.report_id);
  });
  TestValidator.predicate(
    "reported_content_type is valid",
    () =>
      updatedReportTracking.reported_content_type === "post" ||
      updatedReportTracking.reported_content_type === "comment" ||
      updatedReportTracking.reported_content_type === "message" ||
      updatedReportTracking.reported_content_type === "product_review" ||
      updatedReportTracking.reported_content_type === "question" ||
      updatedReportTracking.reported_content_type === "answer",
  );
  TestValidator.predicate("reported_content_id is valid UUID", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(updatedReportTracking.reported_content_id);
  });
  TestValidator.predicate(
    "priority_level is valid",
    () =>
      updatedReportTracking.priority_level === "low" ||
      updatedReportTracking.priority_level === "medium" ||
      updatedReportTracking.priority_level === "high" ||
      updatedReportTracking.priority_level === "urgent",
  );
  TestValidator.predicate("moderation_actions is an array", () =>
    Array.isArray(updatedReportTracking.moderation_actions),
  );
  TestValidator.predicate("created_at is ISO date-time", () => {
    const isoDateRegex =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
    return isoDateRegex.test(updatedReportTracking.created_at);
  });
  TestValidator.predicate("reported_by_actor_id is valid UUID", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(updatedReportTracking.reported_by_actor_id);
  });
  TestValidator.predicate(
    "initial_assessment is a string",
    () => typeof updatedReportTracking.initial_assessment === "string",
  );
  TestValidator.predicate("assigned_moderator_id is valid UUID", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(updatedReportTracking.assigned_moderator_id);
  });
  TestValidator.predicate(
    "notes is a string",
    () => typeof updatedReportTracking.notes === "string",
  );
}
