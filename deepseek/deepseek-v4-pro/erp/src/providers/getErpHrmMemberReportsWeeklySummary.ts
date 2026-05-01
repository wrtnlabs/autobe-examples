import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmWeeklySummaryReport";
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

export async function getErpHrmMemberReportsWeeklySummary(props: {
  member: MemberPayload;
}): Promise<IErpHrmWeeklySummaryReport> {
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
      role: {
        select: {
          name: true,
          is_builtin: true,
        },
      },
    },
    orderBy: { created_at: "asc" },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (employee.role.is_builtin) {
    if (employee.role.name !== "Owner" && employee.role.name !== "Manager") {
      throw new HttpException("Forbidden", 403);
    }
  } else {
    const permissionCount =
      await MyGlobal.prisma.erp_hrm_role_permissions.count({
        where: {
          erp_hrm_role_id: employee.erp_hrm_role_id,
          permission: {
            key: "report:view",
          },
        },
      });
    if (permissionCount === 0) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const organizationId: string = employee.erp_hrm_organization_id;
  const timelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: {
      deleted_at: null,
      employee: {
        erp_hrm_organization_id: organizationId,
        deleted_at: null,
      },
      project: {
        deleted_at: null,
      },
    },
    select: {
      date: true,
      duration_minutes: true,
      billable: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      employee: {
        select: {
          id: true,
          member: {
            select: {
              display_name: true,
            },
          },
        },
      },
    },
  });
  if (timelogs.length === 0) {
    return { weeks: [] } satisfies IErpHrmWeeklySummaryReport;
  }
  const dayOfWeek = (y: number, m: number, d: number): number => {
    const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    const adjY = m < 3 ? y - 1 : y;
    return (
      (adjY +
        Math.floor(adjY / 4) -
        Math.floor(adjY / 100) +
        Math.floor(adjY / 400) +
        t[m - 1] +
        d) %
      7
    );
  };
  const daysInMonth = (y: number, m: number): number => {
    const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const dim = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return dim[m - 1];
  };
  const getISOMonday = (y: number, m: number, d: number): string => {
    const dow = dayOfWeek(y, m, d);
    const diff = dow === 0 ? -6 : 1 - dow;
    let day = d + diff;
    let month = m;
    let year = y;
    if (day < 1) {
      month--;
      if (month < 1) {
        month = 12;
        year--;
      }
      day += daysInMonth(year, month);
    }
    const yyyy = String(year).padStart(4, "0");
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const getISOSunday = (mondayStr: string): string => {
    const parts = mondayStr.split("-").map(Number);
    let year = parts[0];
    let month = parts[1];
    let day = parts[2] + 6;
    const dim = daysInMonth(year, month);
    if (day > dim) {
      day -= dim;
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    const yyyy = String(year).padStart(4, "0");
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  interface WeekBucket {
    weekStartDate: string;
    weekEndDate: string;
    totalMinutes: number;
    billableMinutes: number;
    count: number;
    projectBuckets: Map<
      string,
      {
        projectId: string;
        projectName: string;
        totalMinutes: number;
        billableMinutes: number;
        count: number;
      }
    >;
    employeeBuckets: Map<
      string,
      {
        employeeName: string;
        totalMinutes: number;
        billableMinutes: number;
        count: number;
      }
    >;
  }
  const weekMap = new Map<string, WeekBucket>();
  for (const tl of timelogs) {
    const isoStr: string = tl.date.toISOString();
    const y: number = parseInt(isoStr.substring(0, 4));
    const m: number = parseInt(isoStr.substring(5, 7));
    const d: number = parseInt(isoStr.substring(8, 10));
    const monday: string = getISOMonday(y, m, d);
    let bucket: WeekBucket | undefined = weekMap.get(monday);
    if (bucket === undefined) {
      bucket = {
        weekStartDate: monday,
        weekEndDate: getISOSunday(monday),
        totalMinutes: 0,
        billableMinutes: 0,
        count: 0,
        projectBuckets: new Map(),
        employeeBuckets: new Map(),
      };
      weekMap.set(monday, bucket);
    }
    bucket.totalMinutes += tl.duration_minutes;
    if (tl.billable) {
      bucket.billableMinutes += tl.duration_minutes;
    }
    bucket.count += 1;
    const pid: string = tl.project.id;
    let projBucket = bucket.projectBuckets.get(pid);
    if (projBucket === undefined) {
      projBucket = {
        projectId: pid,
        projectName: tl.project.name,
        totalMinutes: 0,
        billableMinutes: 0,
        count: 0,
      };
      bucket.projectBuckets.set(pid, projBucket);
    }
    projBucket.totalMinutes += tl.duration_minutes;
    if (tl.billable) {
      projBucket.billableMinutes += tl.duration_minutes;
    }
    projBucket.count += 1;
    const eid: string = tl.employee.id;
    let empBucket = bucket.employeeBuckets.get(eid);
    if (empBucket === undefined) {
      empBucket = {
        employeeName: tl.employee.member.display_name,
        totalMinutes: 0,
        billableMinutes: 0,
        count: 0,
      };
      bucket.employeeBuckets.set(eid, empBucket);
    }
    empBucket.totalMinutes += tl.duration_minutes;
    if (tl.billable) {
      empBucket.billableMinutes += tl.duration_minutes;
    }
    empBucket.count += 1;
  }
  const round2 = (n: number): number => Math.round(n * 100) / 100;
  const weeks: IErpHrmWeeklySummaryReport.IWeek[] = [];
  for (const bucket of weekMap.values()) {
    const totalHours: number = round2(bucket.totalMinutes / 60);
    const billableHours: number = round2(bucket.billableMinutes / 60);
    const nonBillableHours: number = round2(totalHours - billableHours);
    const projectBreakdown: IErpHrmWeeklySummaryReport.IProjectBreakdown[] = [];
    for (const pb of bucket.projectBuckets.values()) {
      const pTotalHours: number = round2(pb.totalMinutes / 60);
      const pBillableHours: number = round2(pb.billableMinutes / 60);
      projectBreakdown.push({
        projectId: pb.projectId,
        projectName: pb.projectName,
        totalHours: pTotalHours,
        billableHours: pBillableHours,
        nonBillableHours: round2(pTotalHours - pBillableHours),
        timelogCount: pb.count,
      } satisfies IErpHrmWeeklySummaryReport.IProjectBreakdown);
    }
    const employeeBreakdown: IErpHrmWeeklySummaryReport.IEmployeeBreakdown[] =
      [];
    for (const eb of bucket.employeeBuckets.values()) {
      employeeBreakdown.push({
        employeeName: eb.employeeName,
        totalHours: round2(eb.totalMinutes / 60),
        billableHours: round2(eb.billableMinutes / 60),
        timelogCount: eb.count,
      } satisfies IErpHrmWeeklySummaryReport.IEmployeeBreakdown);
    }
    weeks.push({
      weekStartDate: bucket.weekStartDate,
      weekEndDate: bucket.weekEndDate,
      totalHours,
      billableHours,
      nonBillableHours,
      totalTimelogs: bucket.count,
      projectBreakdown,
      employeeBreakdown,
    } satisfies IErpHrmWeeklySummaryReport.IWeek);
  }
  weeks.sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
  return { weeks } satisfies IErpHrmWeeklySummaryReport;
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
// import { IErpHrmWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmWeeklySummaryReport";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmMemberReportsWeeklySummary(props: {
//   member: MemberPayload;
// }): Promise<IErpHrmWeeklySummaryReport> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------