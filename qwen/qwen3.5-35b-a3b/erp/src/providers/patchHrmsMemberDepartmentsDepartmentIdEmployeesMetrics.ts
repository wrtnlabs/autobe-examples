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
  // Validate department exists and is not soft-deleted
  const department = await MyGlobal.prisma.hrms_departments.findFirstOrThrow({
    where: {
      id: props.departmentId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization: {
        select: {
          id: true,
          owner: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });
  // Get member's organization membership and validate access
  const memberMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      include: {
        organization: {
          select: {
            id: true,
            owner: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  // Validate department belongs to member's organization
  if (
    department.organization.owner.id !== memberMembership.organization.owner.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Build employee query with optional filters
  const includeInactive = props.body.includeInactive ?? false;
  const employeeStatusFilter = includeInactive ? {} : { status: "active" };
  // Calculate total employee count
  const totalEmployeeCount = await MyGlobal.prisma.hrms_employees.count({
    where: {
      department_id: props.departmentId,
      deleted_at: null,
      ...employeeStatusFilter,
    },
  });
  // Calculate active employee count
  const activeEmployeeCount = await MyGlobal.prisma.hrms_employees.count({
    where: {
      department_id: props.departmentId,
      deleted_at: null,
      status: "active",
    },
  });
  // Calculate deactivated employee count
  const deactivatedEmployeeCount = await MyGlobal.prisma.hrms_employees.count({
    where: {
      department_id: props.departmentId,
      deleted_at: null,
      status: "deactivated",
    },
  });
  // Calculate employment type distribution
  const employmentTypeDistribution =
    await MyGlobal.prisma.hrms_employees.groupBy({
      by: ["employment_type"],
      where: {
        department_id: props.departmentId,
        deleted_at: null,
        ...employeeStatusFilter,
      },
      _count: {
        employment_type: true,
      },
    });
  // Convert to object with proper typing
  const employmentTypeDistObj: {
    [key: string]: number & tags.Type<"int32">;
  } = {};
  for (const record of employmentTypeDistribution) {
    employmentTypeDistObj[record.employment_type] =
      record._count.employment_type;
  }
  // Calculate timelog metrics for last 7 and 30 days from now
  // Using ISO string dates to avoid Date type
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Count unique employees with timelogs in last 7 days using groupBy
  const employeesWithTimelogsLastSevenDays =
    await MyGlobal.prisma.hrms_timelogs.groupBy({
      by: ["employee_id"],
      where: {
        employee: {
          department_id: props.departmentId,
          deleted_at: null,
          ...employeeStatusFilter,
        },
        date: {
          gte: sevenDaysAgo,
        },
      },
    });
  const employeesWithTimelogsLastSevenDaysCount =
    employeesWithTimelogsLastSevenDays.length;
  // Count unique employees with timelogs in last 30 days using groupBy
  const employeesWithTimelogsLastThirtyDays =
    await MyGlobal.prisma.hrms_timelogs.groupBy({
      by: ["employee_id"],
      where: {
        employee: {
          department_id: props.departmentId,
          deleted_at: null,
          ...employeeStatusFilter,
        },
        date: {
          gte: thirtyDaysAgo,
        },
      },
    });
  const employeesWithTimelogsLastThirtyDaysCount =
    employeesWithTimelogsLastThirtyDays.length;
  // Calculate unique position count (non-null positions)
  const positionCountResult = await MyGlobal.prisma.hrms_employees.groupBy({
    by: ["position"],
    where: {
      department_id: props.departmentId,
      deleted_at: null,
      ...employeeStatusFilter,
      position: {
        not: null,
      },
    },
  });
  const positionCount = positionCountResult.length;
  return {
    totalEmployeeCount: totalEmployeeCount,
    activeEmployeeCount: activeEmployeeCount,
    deactivatedEmployeeCount: deactivatedEmployeeCount,
    employmentTypeDistribution: employmentTypeDistObj,
    employeesWithTimelogsLastSevenDays: employeesWithTimelogsLastSevenDaysCount,
    employeesWithTimelogsLastThirtyDays:
      employeesWithTimelogsLastThirtyDaysCount,
    positionCount: positionCount,
  } satisfies IHrmsProjectMember.IResponse;
}
