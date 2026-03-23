import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectBudgetReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformAdminProjectBudgetReports(props: {
  admin: AdminPayload;
  body: IHrmPlatformProjectBudgetReport.IRequest;
}): Promise<IPageIHrmPlatformProjectBudgetReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for projects - platform admins see all organizations
  const projectWhere: Prisma.hrm_platform_projectsWhereInput = {
    deleted_at: null,
    budget_hours: { not: null },
    ...(props.body.project_status && {
      status: props.body.project_status,
    }),
    ...(props.body.search && {
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
  };
  // Build where clause for timelogs (for aggregation)
  const timelogWhere: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
    ...(props.body.date_range_start && {
      date: {
        gte: new Date(props.body.date_range_start),
      },
    }),
    ...(props.body.date_range_end && {
      date: {
        lte: new Date(props.body.date_range_end + "T23:59:59"),
      },
    }),
  };
  // Build sort order - map to valid Prisma orderBy fields
  const sortField = props.body.sort ?? "budget_consumption_percentage";
  const sortOrder = props.body.sortOrder ?? "desc";
  // For computed fields, we need to sort after fetching
  const data = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: projectWhere,
    skip,
    take: limit,
    orderBy:
      sortField === "budget_consumption_percentage"
        ? { created_at: sortOrder }
        : { [sortField]: sortOrder },
    select: {
      id: true,
      name: true,
      status: true,
      color_code: true,
      budget_hours: true,
      timelogs: {
        where: timelogWhere,
        select: {
          id: true,
          duration: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.hrm_platform_projects.count({
    where: projectWhere,
  });
  // Transform and sort data
  const transformedData = await ArrayUtil.asyncMap(data, async (project) => {
    const totalMinutes = project.timelogs.reduce(
      (sum, tl) => sum + tl.duration,
      0,
    );
    const actualHours = totalMinutes / 60.0;
    const budgetConsumptionPercentage =
      project.budget_hours && project.budget_hours > 0
        ? (actualHours / project.budget_hours) * 100.0
        : 0.0;
    return {
      id: project.id as string & tags.Format<"uuid">,
      name: project.name,
      status: project.status,
      color_code: project.color_code,
      budget_hours: project.budget_hours ?? 0,
      actual_hours: actualHours,
      budget_consumption_percentage: budgetConsumptionPercentage,
      timelog_count: project.timelogs.length as number & tags.Type<"int32">,
    };
  });
  // Apply client-side sorting for computed fields
  if (sortField === "budget_consumption_percentage") {
    transformedData.sort((a, b) => {
      const diff =
        a.budget_consumption_percentage - b.budget_consumption_percentage;
      return sortOrder === "asc" ? diff : -diff;
    });
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
