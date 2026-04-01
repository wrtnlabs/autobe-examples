import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import { IErpHrmTimeTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimesheetTransformer } from "../transformers/ErpHrmTimeTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberTimesheetsTimesheetIdSubmit(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTimesheet> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const employee = await prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        status: true,
      },
    });
    if (employee.status !== "active") {
      throw new HttpException(
        "Deactivated employees cannot submit timesheets",
        403,
      );
    }
    const timesheet = await prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        erp_hrm_time_employee_id: true,
        status: true,
        timesheetTimelogs: {
          select: {
            id: true,
          },
        },
      },
    });
    const selectedEmployee =
      await prisma.erp_hrm_time_employees.findUniqueOrThrow({
        where: { id: timesheet.erp_hrm_time_employee_id },
        select: {
          id: true,
          erp_hrm_time_member_id: true,
          erp_hrm_time_organization_id: true,
          status: true,
        },
      });
    if (
      selectedEmployee.erp_hrm_time_organization_id !==
      employee.erp_hrm_time_organization_id
    ) {
      throw new HttpException("Forbidden", 403);
    }
    if (timesheet.status !== "draft") {
      throw new HttpException("Only draft timesheets can be submitted", 400);
    }
    if (timesheet.timesheetTimelogs.length === 0) {
      throw new HttpException(
        "Timesheet must include at least one timelog",
        400,
      );
    }
    if (selectedEmployee.status !== "active") {
      throw new HttpException(
        "Deactivated employees cannot submit timesheets",
        403,
      );
    }
    if (selectedEmployee.erp_hrm_time_member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    await prisma.erp_hrm_time_timesheets.update({
      where: { id: props.timesheetId },
      data: {
        status: "submitted",
        submitted_at: new Date(toISOStringSafe(new Date())),
        updated_at: new Date(toISOStringSafe(new Date())),
      },
    });
    const updated = await prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimeTimesheetTransformer.select(),
    });
    return await ErpHrmTimeTimesheetTransformer.transform(updated);
  });
}
