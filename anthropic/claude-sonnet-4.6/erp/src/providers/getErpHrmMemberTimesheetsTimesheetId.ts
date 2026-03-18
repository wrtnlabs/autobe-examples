import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimesheet> {
  // Step 1: Fetch the timesheet with minimal fields for auth check
  const timesheetRaw =
    await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        organization_member_id: true,
        status: true,
        owner: {
          select: {
            id: true,
            organization_id: true,
          },
        },
      },
    });
  // Step 2: Find the requesting member's org membership in the same organization
  const requestingMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: timesheetRaw.owner.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (requestingMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Authorization
  const isOwner = requestingMember.id === timesheetRaw.organization_member_id;
  if (!isOwner) {
    // Check for time:approve or time:view_all permissions
    const permissions = await MyGlobal.prisma.erp_hrm_role_permissions.findMany(
      {
        where: {
          role_id: requestingMember.role_id,
          permission_code: { in: ["time:approve", "time:view_all"] },
        },
        select: {
          permission_code: true,
        },
      },
    );
    const permCodes = permissions.map((p) => p.permission_code);
    const hasTimeApprove = permCodes.includes("time:approve");
    const hasTimeViewAll = permCodes.includes("time:view_all");
    // time:approve can view submitted timesheets, time:view_all can view all
    if (
      !hasTimeViewAll &&
      !(hasTimeApprove && timesheetRaw.status === "submitted")
    ) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 4: Fetch full timesheet with transformer
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    ...ErpHrmTimesheetTransformer.select(),
  });
  return ErpHrmTimesheetTransformer.transform(timesheet);
}
