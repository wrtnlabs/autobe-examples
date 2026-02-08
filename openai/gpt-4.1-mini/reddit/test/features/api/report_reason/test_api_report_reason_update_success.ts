import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { generate_random_community_platform_report_reasons_create } from "../../../generate/generate_random_community_platform_report_reasons_create";

/**
 * Test scenario for updating a content report reason with valid updated 'reason_text' by an authorized admin or moderator.
 * The test will validate that the update persists correctly and the updated reason is returned.
 * Authorization is verified.
 * Dependencies include authenticating as admin or moderator and creating a report reason that will be updated.
 */
export async function test_api_report_reason_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and get authorized
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: typia.random<ICommunityPlatformAdmin.IJoin>(),
    });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create a report reason to update
  const reportReasonWrapper =
    await generate_random_community_platform_report_reasons_create(
      adminConnection,
      {
        body: {
          reason_text: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(reportReasonWrapper);
  // Extract entity from wrapper
  const entity = (reportReasonWrapper as { entity: IEntity & { reason_text: string } }).entity;
  typia.assert(entity);
  // 3. Prepare updated reason_text
  const updatedReasonText = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody: ICommunityPlatformReportReason.IUpdate = {
    reason_text: updatedReasonText,
  };
  // 4. Update the report reason
  const updatedReportReasonWrapper =
    await api.functional.communityPlatform.reportReasons.update(
      adminConnection,
      {
        reportReasonId: entity.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReportReasonWrapper);
  // Extract updated entity from wrapper
  const updatedEntity = (updatedReportReasonWrapper as { entity: IEntity & { reason_text: string } }).entity;
  typia.assert(updatedEntity);
  // 5. Validate the update
  TestValidator.equals(
    "updated reason_text",
    updatedEntity.reason_text,
    updatedReasonText,
  );
}
