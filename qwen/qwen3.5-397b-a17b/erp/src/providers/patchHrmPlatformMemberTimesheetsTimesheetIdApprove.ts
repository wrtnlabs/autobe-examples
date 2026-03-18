import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetTransformer } from "../transformers/HrmPlatformTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimesheetsTimesheetIdApprove(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimesheet> {
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId, deleted_at: null },
      select: {
        id: true,
        status: true,
        employee_id: true,
      },
    });
  if (timesheet.status !== "submitted") {
    throw new HttpException(
      `Cannot approve timesheet in ${timesheet.status} status. Only submitted timesheets can be approved.`,
      400,
    );
  }
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        id: timesheet.employee_id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
        role_id: true,
      },
    });
  const approvingEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: employee.organization_id,
        deleted_at: null,
      },
      select: {
        role_id: true,
      },
    });
  if (!approvingEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: approvingEmployee.role_id },
    select: {
      built_in: true,
      name: true,
    },
  });
  const hasBuiltInPermission =
    role?.built_in === true &&
    (role.name === "Owner" || role.name === "Manager");
  if (!hasBuiltInPermission) {
    const customRolePermissions =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          role_id: approvingEmployee.role_id,
          permission: "time:approve",
          deleted_at: null,
        },
      });
    if (!customRolePermissions) {
      throw new HttpException(
        "Forbidden: User lacks time:approve permission",
        403,
      );
    }
  }
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "approved",
      reviewed_by_id: props.member.id,
      reviewed_at: new Date(),
      rejection_reason: null,
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId, deleted_at: null },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  return await HrmPlatformTimesheetTransformer.transform(updated);
}
