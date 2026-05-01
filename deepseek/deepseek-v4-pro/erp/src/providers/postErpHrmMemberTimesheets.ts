import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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
import { ErpHrmTimesheetCollector } from "../collectors/ErpHrmTimesheetCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimesheets(props: {
  member: MemberPayload;
  body: IErpHrmTimesheet.ICreate;
}): Promise<IErpHrmTimesheet> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: {
      erp_hrm_member_id_erp_hrm_organization_id: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
      },
    },
  });
  if (employee.status !== "active") {
    throw new HttpException(
      "Deactivated employees cannot create timesheets",
      403,
    );
  }
  const isoStr: string = props.body.week_start_date;
  const parsed: RegExpMatchArray | null = isoStr.match(
    /^(\d{4})-(\d{2})-(\d{2})/,
  );
  if (parsed === null) {
    throw new HttpException("Invalid date format", 400);
  }
  const y: number = parseInt(parsed[1], 10);
  const m: number = parseInt(parsed[2], 10);
  const d: number = parseInt(parsed[3], 10);
  const t: number[] = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy: number = m < 3 ? y - 1 : y;
  const dow: number =
    (yy +
      Math.floor(yy / 4) -
      Math.floor(yy / 100) +
      Math.floor(yy / 400) +
      t[m - 1] +
      d) %
    7;
  if (dow !== 1) {
    throw new HttpException("week_start_date must be a Monday", 400);
  }
  const weekStartStr: string = isoStr;
  const existing = await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
    where: {
      employee_id: employee.id,
      week_start_date: weekStartStr,
    },
  });
  if (existing !== null) {
    throw new HttpException("A timesheet already exists for this week", 409);
  }
  const daysInMonth = (yr: number, mo: number): number => {
    if (mo === 2) {
      return (yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0 ? 29 : 28;
    }
    return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  };
  const pad2 = (n: number): string => String(n).padStart(2, "0");
  const record = await MyGlobal.prisma.erp_hrm_timesheets.create({
    data: await ErpHrmTimesheetCollector.collect({
      body: props.body,
      erpHrmEmployees: { id: employee.id },
      erpHrmMemberSessions: { id: session.id },
    }),
    ...ErpHrmTimesheetTransformer.select(),
  });
  let fy: number = y;
  let fm: number = m;
  let fd: number = d + 7;
  while (fd > daysInMonth(fy, fm)) {
    fd -= daysInMonth(fy, fm);
    fm++;
    if (fm > 12) {
      fm = 1;
      fy++;
    }
  }
  const nextDayStr: string = `${fy}-${pad2(fm)}-${pad2(fd)}T00:00:00.000Z`;
  await MyGlobal.prisma.erp_hrm_timelogs.updateMany({
    where: {
      employee_id: employee.id,
      timesheet_id: null,
      date: {
        gte: weekStartStr,
        lt: nextDayStr,
      },
      deleted_at: null,
    },
    data: {
      timesheet_id: record.id,
    },
  });
  const updated = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: record.id },
    ...ErpHrmTimesheetTransformer.select(),
  });
  return await ErpHrmTimesheetTransformer.transform(updated);
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
// import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberTimesheets(props: {
//   member: MemberPayload;
//   body: IErpHrmTimesheet.ICreate;
// }): Promise<IErpHrmTimesheet> {
//   const record = await MyGlobal.prisma.erp_hrm_timesheets.create({
//     data: await ErpHrmTimesheetCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmTimesheetTransformer.select(),
//   });
//   return await ErpHrmTimesheetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------