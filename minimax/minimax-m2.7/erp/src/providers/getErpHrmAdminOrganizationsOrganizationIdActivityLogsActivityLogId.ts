import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminOrganizationsOrganizationIdActivityLogsActivityLogId(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
  activityLogId: string & tags.Format<"uuid">;
}): Promise<IErpHrmActivityLog> {
  // Validate the organization exists
  await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
    select: { id: true },
  });
  // Retrieve the activity log with member information
  const activityLog =
    await MyGlobal.prisma.erp_hrm_activity_logs.findUniqueOrThrow({
      where: { id: props.activityLogId },
      select: {
        id: true,
        erp_hrm_organization_id: true,
        erp_hrm_member_id: true,
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        details: true,
        created_at: true,
        member: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
      },
    });
  // Verify the activity log belongs to the specified organization
  if (activityLog.erp_hrm_organization_id !== props.organizationId) {
    throw new HttpException(
      "Activity log not found in the specified organization",
      404,
    );
  }
  // Parse the details JSON field if present
  let parsedDetails: Record<string, unknown> | null = null;
  if (activityLog.details) {
    try {
      parsedDetails = JSON.parse(activityLog.details);
    } catch {
      parsedDetails = null;
    }
  }
  // Build and return the response with all required fields including member info
  return typia.assert<IErpHrmActivityLog>({
    organizationId: activityLog.erp_hrm_organization_id,
    memberId: activityLog.erp_hrm_member_id,
    actionType: activityLog.action_type,
    targetEntityType: activityLog.target_entity_type,
    targetEntityId: activityLog.target_entity_id,
    details: parsedDetails,
    createdAt: toISOStringSafe(activityLog.created_at),
    member: {
      id: activityLog.member.id,
      displayName: activityLog.member.display_name,
      email: activityLog.member.email,
    },
  });
}
