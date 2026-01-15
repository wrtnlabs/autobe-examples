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
export async function test_api_notification_annotation_update_tags(
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
  // Step 2: Generate a valid UUID for annotationId (assuming an annotation exists)
  const annotationId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update annotation tags with new keywords (5 tags)
  const newTags = ArrayUtil.repeat(5, () => RandomGenerator.alphaNumeric(8));
  const updatedWithTags =
    await api.functional.communityPlatform.notification_annotations.update(
      adminConnection,
      {
        annotationId,
        body: {
          tags: newTags,
        } satisfies ICommunityPlatformNotificationAnnotation.IUpdate,
      },
    );
  typia.assert(updatedWithTags);
  TestValidator.equals("tags updated correctly", updatedWithTags.tags, newTags);
  // Step 4: Update annotation tags with empty array to clear all tags
  const updatedWithEmptyTags =
    await api.functional.communityPlatform.notification_annotations.update(
      adminConnection,
      {
        annotationId,
        body: {
          tags: [],
        } satisfies ICommunityPlatformNotificationAnnotation.IUpdate,
      },
    );
  typia.assert(updatedWithEmptyTags);
  TestValidator.equals(
    "tags cleared successfully",
    updatedWithEmptyTags.tags,
    [],
  );
  // Step 5: Verify that adding more than 10 tags is rejected
  const tooManyTags = ArrayUtil.repeat(11, () =>
    RandomGenerator.alphaNumeric(8),
  );
  await TestValidator.error("should reject more than 10 tags", async () => {
    await api.functional.communityPlatform.notification_annotations.update(
      adminConnection,
      {
        annotationId,
        body: {
          tags: tooManyTags,
        } satisfies ICommunityPlatformNotificationAnnotation.IUpdate,
      },
    );
  });
}
