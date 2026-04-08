import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
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

export async function patchErpHrmMemberTimesheetsTimesheetIdTimelogs(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimesheetTimelog.IRequest;
}): Promise<IErpHrmTimesheet> {
  // 1. Fetch timesheet with employee ownership and validate it exists
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findFirstOrThrow({
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      week_start_date: true,
      week_end_date: true,
      status: true,
      total_hours: true,
    },
  });
  // 2. Get requesting user's employee record with role permissions
  const requestingEmployee =
    await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
      where: {
        erp_hrm_member_id: props.member.id,
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
  // 3. Check permission: must own timesheet or have time:manage permission
  const hasTimeManagePermission = requestingEmployee.role.rolePermissions.some(
    (rp) => rp.permission === "time:manage",
  );
  const isOwner = timesheet.erp_hrm_employee_id === requestingEmployee.id;
  if (!isOwner && !hasTimeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Reject if timesheet is locked (submitted or approved)
  if (timesheet.status === "submitted" || timesheet.status === "approved") {
    throw new HttpException(
      "Cannot modify timelog associations on a locked timesheet",
      400,
    );
  }
  const weekStartDate = timesheet.week_start_date;
  const weekEndDate = timesheet.week_end_date;
  // 5. Process addTimelogIds
  if (props.body.addTimelogIds && props.body.addTimelogIds.length > 0) {
    // Fetch all timelogs to add with ownership validation
    const timelogsToAdd = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
      where: {
        id: { in: props.body.addTimelogIds },
        erp_hrm_employee_id: timesheet.erp_hrm_employee_id,
      },
      select: {
        id: true,
        date: true,
      },
    });
    // Validate all requested timelogs exist and belong to owner
    if (timelogsToAdd.length !== props.body.addTimelogIds.length) {
      const foundIds = new Set(timelogsToAdd.map((t) => t.id));
      const notFoundIds = props.body.addTimelogIds.filter(
        (id) => !foundIds.has(id),
      );
      throw new HttpException(
        `Timelogs not found or do not belong to timesheet owner: ${notFoundIds.join(", ")}`,
        400,
      );
    }
    // Validate all timelogs fall within week date range
    for (const timelog of timelogsToAdd) {
      if (timelog.date < weekStartDate || timelog.date > weekEndDate) {
        throw new HttpException(
          `Timelog ${timelog.id} date is outside the timesheet week range`,
          400,
        );
      }
    }
    // Check for existing associations to avoid duplicates
    const existingAssociations =
      await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findMany({
        where: {
          erp_hrm_timesheet_id: props.timesheetId,
          erp_hrm_timelog_id: { in: props.body.addTimelogIds },
        },
        select: {
          erp_hrm_timelog_id: true,
        },
      });
    const alreadyAssociatedIds = new Set(
      existingAssociations.map((a) => a.erp_hrm_timelog_id),
    );
    const newTimelogIds = props.body.addTimelogIds.filter(
      (id) => !alreadyAssociatedIds.has(id),
    );
    // Create new association records
    const now = new Date();
    const associationsToCreate = newTimelogIds.map((timelogId) => ({
      id: v4(),
      erp_hrm_timesheet_id: props.timesheetId,
      erp_hrm_timelog_id: timelogId,
      added_at: now,
    }));
    if (associationsToCreate.length > 0) {
      await MyGlobal.prisma.erp_hrm_timesheet_timelogs.createMany({
        data: associationsToCreate,
      });
    }
  }
  // 6. Process removeTimelogIds
  if (props.body.removeTimelogIds && props.body.removeTimelogIds.length > 0) {
    // Verify all requested timelogs are currently associated
    const existingAssociations =
      await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findMany({
        where: {
          erp_hrm_timesheet_id: props.timesheetId,
          erp_hrm_timelog_id: { in: props.body.removeTimelogIds },
        },
        select: {
          id: true,
        },
      });
    if (existingAssociations.length !== props.body.removeTimelogIds.length) {
      throw new HttpException(
        "Some timelogs are not associated with this timesheet",
        400,
      );
    }
    // Delete the association records
    await MyGlobal.prisma.erp_hrm_timesheet_timelogs.deleteMany({
      where: {
        erp_hrm_timesheet_id: props.timesheetId,
        erp_hrm_timelog_id: { in: props.body.removeTimelogIds },
      },
    });
  }
  // 7. Recalculate total_hours from all associated timelogs
  const associatedTimelogs =
    await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findMany({
      where: {
        erp_hrm_timesheet_id: props.timesheetId,
      },
      select: {
        timelog: {
          select: {
            duration_minutes: true,
          },
        },
      },
    });
  const totalMinutes = associatedTimelogs.reduce(
    (sum, st) => sum + st.timelog.duration_minutes,
    0,
  );
  const totalHours = totalMinutes / 60;
  // 8. Update timesheet with new total_hours
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      total_hours: totalHours,
      updated_at: new Date(),
    },
  });
  // 9. Fetch and return updated timesheet with all associations
  const updatedTimesheet =
    await MyGlobal.prisma.erp_hrm_timesheets.findFirstOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimesheetTransformer.select(),
    });
  return await ErpHrmTimesheetTransformer.transform(updatedTimesheet);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
// import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberTimesheetsTimesheetIdTimelogs(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
//   body: IErpHrmTimesheetTimelog.IRequest;
// }): Promise<IErpHrmTimesheet> {
//   const record = await MyGlobal.prisma.erp_hrm_timesheets.findFirstOrThrow({
//     ...ErpHrmTimesheetTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmTimesheetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------