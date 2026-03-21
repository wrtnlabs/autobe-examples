import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimelog> {
  // Get the session to find current organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization selected", 400);
  }
  // Find the current user's employee record in this organization
  const currentEmployee =
    await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
      where: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_role_id: true,
      },
    });
  // Get the timelog using transformer select
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findFirst({
    where: {
      id: props.timelogId,
      deleted_at: null,
    },
    ...ErpHrmTimelogTransformer.select(),
  });
  if (timelog === null) {
    throw new HttpException("Timelog not found", 404);
  }
  // Check if user owns the timelog
  const isOwner = timelog.employee.id === currentEmployee.id;
  if (isOwner) {
    return await ErpHrmTimelogTransformer.transform(timelog);
  }
  // Check if user has time:view_all permission
  const viewAllPermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: currentEmployee.erp_hrm_role_id,
        permission: "time:view_all",
      },
    });
  if (viewAllPermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the timelog's employee is in the same organization
  const timelogEmployeeOrg =
    await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
      where: { id: timelog.employee.id },
      select: { erp_hrm_organization_id: true },
    });
  if (
    timelogEmployeeOrg.erp_hrm_organization_id !==
    session.erp_hrm_organization_id
  ) {
    throw new HttpException("Timelog not found", 404);
  }
  return await ErpHrmTimelogTransformer.transform(timelog);
}
