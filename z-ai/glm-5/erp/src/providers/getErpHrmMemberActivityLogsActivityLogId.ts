import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
  // Get the member's session to find current organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        erp_hrm_organization_id: true,
      },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  // Get the employee record to check permissions
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      erp_hrm_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found in organization", 403);
  }
  // Check if the role has org:manage permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      erp_hrm_role_id: employee.erp_hrm_role_id,
      permission: "org:manage",
    },
  });
  if (permission === null) {
    throw new HttpException("Forbidden - org:manage permission required", 403);
  }
  // Query the activity log with organization filter for data isolation
  const activityLog =
    await MyGlobal.prisma.erp_hrm_activity_logs.findFirstOrThrow({
      where: {
        id: props.activityLogId,
        organization_id: session.erp_hrm_organization_id,
      },
      ...ErpHrmActivityLogTransformer.select(),
    });
  return ErpHrmActivityLogTransformer.transform(activityLog);
}
