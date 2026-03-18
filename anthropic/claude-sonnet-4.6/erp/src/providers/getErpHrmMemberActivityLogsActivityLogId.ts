import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmActivityLogTransformer } from "../transformers/ErpHrmActivityLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberActivityLogsActivityLogId(props: {
  member: MemberPayload;
  activityLogId: string & tags.Format<"uuid">;
}): Promise<IErpHrmActivityLog> {
  // Step 1: Query the activity log (auto-404 if not found)
  const activityLog =
    await MyGlobal.prisma.erp_hrm_activity_logs.findUniqueOrThrow({
      where: { id: props.activityLogId },
      ...ErpHrmActivityLogTransformer.select(),
    });
  // Step 2: Verify the requesting member belongs to the same organization
  // and holds the org:manage permission
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: activityLog.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            permissions: {
              select: {
                permission_code: true,
              },
            },
          },
        },
      },
    });
  // Step 3: Cross-organization access denial
  if (orgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Verify org:manage permission
  const hasOrgManage = orgMember.role.permissions.some(
    (p) => p.permission_code === "org:manage",
  );
  if (!hasOrgManage) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 5: Return the full transformed result
  return ErpHrmActivityLogTransformer.transform(activityLog);
}
