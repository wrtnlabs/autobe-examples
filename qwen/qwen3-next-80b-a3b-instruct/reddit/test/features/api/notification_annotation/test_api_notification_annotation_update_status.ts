import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformNotificationAnnotation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationAnnotation";
import type { ICommunityPlatformNotificationAnnotationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationAnnotationMetadata";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportMetadata";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { generate_random_community_platform_admin_reports_create } from "../../../generate/generate_random_community_platform_admin_reports_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_notification_annotation_update_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin user via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // Step 2: Create a report to generate a notification annotation
  const report = await generate_random_community_platform_admin_reports_create(
    adminConnection,
    {
      body: {
        event_type: "content_flag",
        severity: "high",
        content_identifier: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // Step 3: Use report.content_identifier as the annotationId - use typia.assert to extract full response
  const annotationId = typia.assert<{ content_identifier: string & tags.Format<"uuid"> }>(report).content_identifier;
  // Step 4: Update the annotation status to 'resolved' with resolution_notes
  const updatedAnnotation =
    await api.functional.communityPlatform.notification_annotations.update(
      adminConnection,
      {
        annotationId: annotationId,
        body: {
          status: "resolved",
          resolution_notes: "Marked as resolved due to user report.",
        } satisfies ICommunityPlatformNotificationAnnotation.IUpdate,
      },
    );
  typia.assert(updatedAnnotation);
  // Step 5: Validate the update operation
  const updatedAnnotationTyped = typia.assert<ICommunityPlatformNotificationAnnotation & { resolution_notes: string }>(updatedAnnotation);
  TestValidator.equals(
    "status updated to 'resolved'",
    updatedAnnotationTyped.status,
    "resolved",
  );
  TestValidator.equals(
    "resolution_notes field preserved",
    updatedAnnotationTyped.resolution_notes,
    "Marked as resolved due to user report.",
  );
}