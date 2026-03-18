import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimeReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformProjectAtSummaryTransformer } from "../transformers/HrmPlatformProjectAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "../transformers/HrmPlatformTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberReportsTime(props: {
  member: MemberPayload;
  body: IHrmPlatformTimeReport.IRequest;
}): Promise<IPageIHrmPlatformTimeReport.ISummary> {
  // Validate date range
  const startDate = new Date(props.body.startDate);
  const endDate = new Date(props.body.endDate);
  if (startDate > endDate) {
    throw new HttpException(
      "Start date must be before or equal to end date",
      400,
    );
  }
  // Validate groupBy
  const groupBy = props.body.groupBy;
  if (groupBy !== "employee" && groupBy !== "project" && groupBy !== "task") {
    throw new HttpException("Invalid groupBy value", 400);
  }
  // Validate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  // Get member's organization context
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  // Build where clause for timelogs with organization context
  const whereInput: Prisma.hrm_platform_timelogsWhereInput = {
    date: {
      gte: startDate,
      lte: endDate,
    },
    deleted_at: null,
    employee: {
      hrm_platform_organization_id: employee.hrm_platform_organization_id,
      deleted_at: null,
    },
    ...(props.body.employee_id && {
      hrm_platform_employee_id: props.body.employee_id,
    }),
    ...(props.body.project_id && {
      hrm_platform_project_id: props.body.project_id,
    }),
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
  };
  // Get total count
  const total = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: whereInput,
  });
  // Group by dimension and aggregate
  let groupedData: Array<{
    id: string;
    employee_id?: string;
    project_id?: string;
    task_id?: string | null;
    total_hours: number;
    billable_hours: number;
    non_billable_hours: number;
  }> = [];
  if (groupBy === "employee") {
    const result = await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
      by: ["hrm_platform_employee_id"],
      where: whereInput,
      _sum: {
        duration_minutes: true,
      },
    });
    const billableResult = await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
      by: ["hrm_platform_employee_id"],
      where: {
        ...whereInput,
        billable: true,
      },
      _sum: {
        duration_minutes: true,
      },
    });
    const nonBillableResult =
      await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
        by: ["hrm_platform_employee_id"],
        where: {
          ...whereInput,
          billable: false,
        },
        _sum: {
          duration_minutes: true,
        },
      });
    const billableMap = new Map(
      billableResult.map((r) => [
        r.hrm_platform_employee_id,
        r._sum.duration_minutes ?? 0,
      ]),
    );
    const nonBillableMap = new Map(
      nonBillableResult.map((r) => [
        r.hrm_platform_employee_id,
        r._sum.duration_minutes ?? 0,
      ]),
    );
    groupedData = result.map((r) => ({
      id: r.hrm_platform_employee_id,
      employee_id: r.hrm_platform_employee_id,
      total_hours: (r._sum.duration_minutes ?? 0) / 60,
      billable_hours: (billableMap.get(r.hrm_platform_employee_id) ?? 0) / 60,
      non_billable_hours:
        (nonBillableMap.get(r.hrm_platform_employee_id) ?? 0) / 60,
    }));
  } else if (groupBy === "project") {
    const result = await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
      by: ["hrm_platform_project_id"],
      where: whereInput,
      _sum: {
        duration_minutes: true,
      },
    });
    const billableResult = await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
      by: ["hrm_platform_project_id"],
      where: {
        ...whereInput,
        billable: true,
      },
      _sum: {
        duration_minutes: true,
      },
    });
    const nonBillableResult =
      await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
        by: ["hrm_platform_project_id"],
        where: {
          ...whereInput,
          billable: false,
        },
        _sum: {
          duration_minutes: true,
        },
      });
    const billableMap = new Map(
      billableResult.map((r) => [
        r.hrm_platform_project_id,
        r._sum.duration_minutes ?? 0,
      ]),
    );
    const nonBillableMap = new Map(
      nonBillableResult.map((r) => [
        r.hrm_platform_project_id,
        r._sum.duration_minutes ?? 0,
      ]),
    );
    groupedData = result.map((r) => ({
      id: r.hrm_platform_project_id,
      project_id: r.hrm_platform_project_id,
      total_hours: (r._sum.duration_minutes ?? 0) / 60,
      billable_hours: (billableMap.get(r.hrm_platform_project_id) ?? 0) / 60,
      non_billable_hours:
        (nonBillableMap.get(r.hrm_platform_project_id) ?? 0) / 60,
    }));
  } else {
    // groupBy === "task"
    const result = await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
      by: ["hrm_platform_task_id"],
      where: whereInput,
      _sum: {
        duration_minutes: true,
      },
    });
    const billableResult = await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
      by: ["hrm_platform_task_id"],
      where: {
        ...whereInput,
        billable: true,
      },
      _sum: {
        duration_minutes: true,
      },
    });
    const nonBillableResult =
      await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
        by: ["hrm_platform_task_id"],
        where: {
          ...whereInput,
          billable: false,
        },
        _sum: {
          duration_minutes: true,
        },
      });
    const billableMap = new Map(
      billableResult.map((r) => [
        r.hrm_platform_task_id,
        r._sum.duration_minutes ?? 0,
      ]),
    );
    const nonBillableMap = new Map(
      nonBillableResult.map((r) => [
        r.hrm_platform_task_id,
        r._sum.duration_minutes ?? 0,
      ]),
    );
    groupedData = result
      .filter((r) => r.hrm_platform_task_id !== null)
      .map((r) => ({
        id: r.hrm_platform_task_id!,
        task_id: r.hrm_platform_task_id,
        total_hours: (r._sum.duration_minutes ?? 0) / 60,
        billable_hours: (billableMap.get(r.hrm_platform_task_id) ?? 0) / 60,
        non_billable_hours:
          (nonBillableMap.get(r.hrm_platform_task_id) ?? 0) / 60,
      }));
  }
  // Apply pagination
  const paginatedData = groupedData.slice(skip, skip + limit);
  // Build response with entity metadata
  const data = await ArrayUtil.asyncMap(paginatedData, async (item) => {
    const base: IHrmPlatformTimeReport.ISummary = {
      id: v4() as string & tags.Format<"uuid">,
      total_hours: item.total_hours,
      billable_hours: item.billable_hours,
      non_billable_hours: item.non_billable_hours,
      date_range: {
        start: props.body.startDate,
        end: props.body.endDate,
      },
    };
    if (groupBy === "employee" && item.employee_id) {
      const employee =
        await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
          where: { id: item.employee_id },
          ...HrmPlatformEmployeeAtSummaryTransformer.select(),
        });
      return {
        ...base,
        employee:
          await HrmPlatformEmployeeAtSummaryTransformer.transform(employee),
        project: undefined,
        task: undefined,
      } satisfies IHrmPlatformTimeReport.ISummary;
    } else if (groupBy === "project" && item.project_id) {
      const project =
        await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
          where: { id: item.project_id },
          ...HrmPlatformProjectAtSummaryTransformer.select(),
        });
      return {
        ...base,
        employee: undefined,
        project:
          await HrmPlatformProjectAtSummaryTransformer.transform(project),
        task: undefined,
      } satisfies IHrmPlatformTimeReport.ISummary;
    } else if (groupBy === "task" && item.task_id) {
      const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
        where: { id: item.task_id },
        ...HrmPlatformTaskAtSummaryTransformer.select(),
      });
      return {
        ...base,
        employee: undefined,
        project: undefined,
        task: await HrmPlatformTaskAtSummaryTransformer.transform(task),
      } satisfies IHrmPlatformTimeReport.ISummary;
    }
    return base satisfies IHrmPlatformTimeReport.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIHrmPlatformTimeReport.ISummary;
}
