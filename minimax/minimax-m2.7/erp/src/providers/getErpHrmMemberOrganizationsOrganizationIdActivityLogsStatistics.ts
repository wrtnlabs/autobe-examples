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

export async function getErpHrmMemberOrganizationsOrganizationIdActivityLogsStatistics(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmActivityLog> {
  // Step 1: Verify organization exists (404 if not found)
  await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
  });
  // Step 2: Get employee and verify org:manage permission
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if employee has org:manage permission
  const rolePermissions =
    await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
      },
    });
  const hasOrgManagePermission = rolePermissions.some(
    (rp) => rp.permission === "org:manage",
  );
  if (!hasOrgManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Execute aggregation queries
  const whereClause = {
    erp_hrm_organization_id: props.organizationId,
  };
  // Total count of activity logs
  const totalEntries = await MyGlobal.prisma.erp_hrm_activity_logs.count({
    where: whereClause,
  });
  // Step 4: Build response
  return {
    action_type: "total_entries",
    count: totalEntries as number & tags.Type<"int32">,
  };
}
