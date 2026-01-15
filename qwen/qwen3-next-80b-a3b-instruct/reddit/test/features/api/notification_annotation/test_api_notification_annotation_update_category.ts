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
export async function test_api_notification_annotation_update_category(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a notification annotation through report submission
  // Generate a random UUID that will serve as both content_identifier and annotationId
  const targetId = typia.random<string & tags.Format<"uuid">>();
  const report = await generate_random_community_platform_admin_reports_create(
    adminConnection,
    {
      body: {
        event_type: "content_flag",
        severity: "high",
        content_identifier: targetId, // Use generated UUID as content_identifier
        report_description: "Flagged for spam content",
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // Step 3: Update the notification annotation category from spam to hate_speech
  // We assume that the notification annotation has been created with target_id matching content_identifier
  // We'll use the same UUID as annotationId (architecture assumption)
  const updatedAnnotation =
    await api.functional.communityPlatform.notification_annotations.update(
      adminConnection,
      {
        annotationId: targetId, // Use the same UUID as annotationId
        body: {
          category: "hate_speech", // Valid enum value
        } satisfies ICommunityPlatformNotificationAnnotation.IUpdate,
      },
    );
  typia.assert(updatedAnnotation);
  // Step 4: Validate that the category was updated to hate_speech
  TestValidator.equals(
    "category updated to hate_speech",
    updatedAnnotation.category,
    "hate_speech",
  );
  // Step 5: Skip updated_at check since it doesn't exist on ICommunityPlatformNotificationAnnotation
  // Step 6: Validate that core relationship (target_id) remains unchanged
  TestValidator.equals(
    "target_id unchanged",
    updatedAnnotation.target_id,
    targetId,
  );
}
