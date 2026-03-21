import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberOrganizationsOrganizationIdActivityLogsActivityLogId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  activityLogId: string & tags.Format<"uuid">;
}): Promise<IErpHrmActivityLog> {
  // Validate organization exists
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: { id: true, owner_id: true },
    });
  // Verify member is enrolled in the organization with org:manage permission
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
      role: {
        select: {
          rolePermissions: {
            select: {
              permission: true,
            },
          },
        },
      },
    },
  });
  const hasOrgManage = employee.role.rolePermissions.some(
    (rp: { permission: string }) => rp.permission === "org:manage",
  );
  // Check authorization: must have org:manage permission OR be organization owner
  if (!hasOrgManage && organization.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch activity log
  const activityLog =
    await MyGlobal.prisma.erp_hrm_activity_logs.findUniqueOrThrow({
      where: { id: props.activityLogId },
      select: {
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        erp_hrm_organization_id: true,
        details: true,
        created_at: true,
      },
    });
  // Verify activity log belongs to the specified organization
  if (activityLog.erp_hrm_organization_id !== props.organizationId) {
    throw new HttpException("Activity log not found in this organization", 404);
  }
  // Return the activity log response (aggregated count of 1 for single entry)
  return {
    action_type: activityLog.action_type,
    count: typia.assert<number & tags.Type<"int32">>(1),
  };
}
