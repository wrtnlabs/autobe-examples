import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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

export async function postErpHrmMemberTimesheetsTimesheetIdApprove(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimesheet> {
  // Get current user's organization membership with role permissions
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
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
  // Verify caller has timesheet approval permission
  const hasApprovalPermission = organizationMember.role.rolePermissions.some(
    (rp: { permission: string }) => rp.permission === "time:approve",
  );
  if (!hasApprovalPermission) {
    throw new HttpException(
      "Forbidden: timesheet approval permission required",
      403,
    );
  }
  // Fetch the timesheet
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  // Validate timesheet status per business rule 477
  if (timesheet.status === "draft") {
    throw new HttpException(
      "Bad Request: only submitted timesheets can be reviewed",
      400,
    );
  }
  if (timesheet.status === "approved") {
    throw new HttpException("Conflict: timesheet is already approved", 409);
  }
  if (timesheet.status !== "submitted") {
    throw new HttpException(
      "Bad Request: timesheet must be in submitted status to approve",
      400,
    );
  }
  // Update timesheet to approved status with current timestamp
  const now = new Date();
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: {
      id: props.timesheetId,
    },
    data: {
      status: "approved",
      reviewed_by_id: organizationMember.id,
      reviewed_at: now,
      updated_at: now,
    },
  });
  // Fetch updated timesheet with full transformer select
  const updatedTimesheet =
    await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      ...ErpHrmTimesheetTransformer.select(),
    });
  return await ErpHrmTimesheetTransformer.transform(updatedTimesheet);
}
