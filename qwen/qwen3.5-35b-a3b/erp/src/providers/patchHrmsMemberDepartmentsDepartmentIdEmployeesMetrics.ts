import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
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

export async function patchHrmsMemberDepartmentsDepartmentIdEmployeesMetrics(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmsProjectMember.IRequest;
}): Promise<IHrmsProjectMember.IResponse> {
  // Validate department exists and belongs to member's organization
  const department = await MyGlobal.prisma.hrms_departments.findUniqueOrThrow({
    where: {
      id: props.departmentId,
      deleted_at: null,
    },
  });
  // Build base where clause for employees in this department
  const baseEmployeeWhere: Prisma.hrms_employeesWhereInput = {
    department_id: props.departmentId,
    deleted_at: null,
  };
  // Calculate total employee count (all statuses)
  const totalEmployeeCount = await MyGlobal.prisma.hrms_employees.count({
    where: baseEmployeeWhere,
  });
  // Calculate active employee count
  const activeEmployeeCount = await MyGlobal.prisma.hrms_employees.count({
    where: {
      ...baseEmployeeWhere,
      status: "active",
    },
  });
  // Calculate deactivated employee count
  const deactivatedEmployeeCount = await MyGlobal.prisma.hrms_employees.count({
    where: {
      ...baseEmployeeWhere,
      status: "deactivated",
    },
  });
  // Calculate employment type distribution using GROUP BY
  const employmentTypeDistributionData =
    await MyGlobal.prisma.hrms_employees.groupBy({
      by: ["employment_type"],
      where: baseEmployeeWhere,
      _count: { employment_type: true },
    });
  const employmentTypeDistribution: {
    [key: string]: number;
  } = {};
  for (const item of employmentTypeDistributionData) {
    employmentTypeDistribution[item.employment_type] =
      item._count.employment_type;
  }
  // Build date filter for timelogs
  const timelogDateFilter: Prisma.hrms_timelogsWhereInput | undefined =
    props.body.startDate || props.body.endDate
      ? {
          deleted_at: null,
          ...(props.body.startDate
            ? { date: { gte: props.body.startDate } }
            : {}),
          ...(props.body.endDate ? { date: { lte: props.body.endDate } } : {}),
        }
      : undefined;
  // Calculate employees with timelogs in last 7 days
  const sevenDaysAgo = props.body.startDate
    ? props.body.startDate
    : (() => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split("T")[0];
      })();
  const employeesWithTimelogsLastSevenDays =
    await MyGlobal.prisma.hrms_employees.count({
      where: {
        ...baseEmployeeWhere,
        timelogs: {
          some: {
            ...(timelogDateFilter
              ? timelogDateFilter
              : {
                  deleted_at: null,
                  date: { gte: sevenDaysAgo },
                }),
          },
        },
      },
    });
  // Calculate employees with timelogs in last 30 days
  const thirtyDaysAgo = props.body.startDate
    ? props.body.startDate
    : (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split("T")[0];
      })();
  const employeesWithTimelogsLastThirtyDays =
    await MyGlobal.prisma.hrms_employees.count({
      where: {
        ...baseEmployeeWhere,
        timelogs: {
          some: {
            ...(timelogDateFilter
              ? timelogDateFilter
              : {
                  deleted_at: null,
                  date: { gte: thirtyDaysAgo },
                }),
          },
        },
      },
    });
  // Calculate unique position count
  const positionData = await MyGlobal.prisma.hrms_employees.groupBy({
    by: ["position"],
    where: {
      ...baseEmployeeWhere,
      position: { not: null },
    },
    _count: { position: true },
  });
  const positionCount = positionData.length;
  return {
    totalEmployeeCount,
    activeEmployeeCount,
    deactivatedEmployeeCount,
    employmentTypeDistribution,
    employeesWithTimelogsLastSevenDays,
    employeesWithTimelogsLastThirtyDays,
    positionCount,
  } satisfies IHrmsProjectMember.IResponse;
}
