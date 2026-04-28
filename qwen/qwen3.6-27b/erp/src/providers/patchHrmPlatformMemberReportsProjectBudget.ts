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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberReportsProjectBudget(props: {
  member: MemberPayload;
  body: IHrmPlatformProjectBudgetReport.IRequest;
}): Promise<IPageIHrmPlatformProjectBudgetReport.ISummary> {
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: {
        id: props.member.session_id,
      },
      select: {
        hrm_platform_member_id: true,
      },
    });
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_member_id: session.hrm_platform_member_id,
        status: "active",
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  const organizationId = employee.hrm_platform_organization_id;
  const limit = Math.min(Math.max(Math.round(props.body.limit ?? 20), 1), 100);
  const baseWhere: Prisma.hrm_platform_projectsWhereInput = {
    hrm_platform_organization_id: organizationId,
    deleted_at: null,
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.searchTerm !== undefined && {
      name: {
        contains: props.body.searchTerm,
        mode: "insensitive",
      },
    }),
  };
  const total = await MyGlobal.prisma.hrm_platform_projects.count({
    where: baseWhere,
  });
  const sortField = props.body.sortField ?? "created_at";
  const sortDirection = (
    props.body.sortDirection === "asc" ? "asc" : "desc"
  ) satisfies "asc" | "desc";
  const orderByInput: Prisma.hrm_platform_projectsOrderByWithRelationInput = {
    [sortField]: sortDirection,
  };
  type ProjectSelect = {
    id: string;
    name: string;
    budget: number | null;
  };
  let projects: ProjectSelect[] = [];
  if (props.body.cursor !== undefined && props.body.cursor !== null) {
    projects = await MyGlobal.prisma.hrm_platform_projects.findMany({
      where: baseWhere,
      orderBy: orderByInput,
      cursor: {
        id: props.body.cursor,
      },
      skip: 1,
      take: limit,
      select: {
        id: true,
        name: true,
        budget: true,
      },
    });
  } else {
    const page = Math.max(props.body.page ?? 0, 0);
    const skip = page * limit;
    projects = await MyGlobal.prisma.hrm_platform_projects.findMany({
      where: baseWhere,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        budget: true,
      },
    });
  }
  if (projects.length === 0) {
    const page = Math.max(props.body.page ?? 0, 0);
    return {
      pagination: {
        current: (page + 1) satisfies number as number,
        limit: limit satisfies number as number,
        records: total satisfies number as number,
        pages: Math.ceil(total / limit) satisfies number as number,
      } satisfies IPage.IPagination,
      data: [],
    } satisfies IPageIHrmPlatformProjectBudgetReport.ISummary;
  }
  const projectIds = projects.map((p) => p.id);
  const timelogWhere: Prisma.hrm_platform_timelogsWhereInput = {
    hrm_platform_project_id: {
      in: projectIds,
    },
    ...(props.body.dateFrom !== undefined && {
      date: {
        gte: new Date(props.body.dateFrom),
      },
    }),
    ...(props.body.dateTo !== undefined && {
      date: {
        lte: new Date(props.body.dateTo),
      },
    }),
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
  };
  const timelogAggregates = await MyGlobal.prisma.hrm_platform_timelogs.groupBy(
    {
      by: ["hrm_platform_project_id"],
      where: timelogWhere,
      _sum: {
        duration_minutes: true,
      },
      _count: {
        id: true,
      },
    },
  );
  const projectTimelogMap = new Map<
    string,
    {
      totalMinutes: number;
      count: number;
    }
  >();
  for (const agg of timelogAggregates) {
    projectTimelogMap.set(agg.hrm_platform_project_id, {
      totalMinutes: agg._sum.duration_minutes ?? 0,
      count: agg._count.id,
    });
  }
  const data: IHrmPlatformProjectBudgetReport.ISummary[] = projects.map((p) => {
    const actualMinutes = projectTimelogMap.get(p.id)?.totalMinutes ?? 0;
    const actualHours = actualMinutes / 60;
    const totalTimelogs = projectTimelogMap.get(p.id)?.count ?? 0;
    const utilizationPercentage =
      p.budget !== null && p.budget > 0 ? (actualHours / p.budget) * 100 : null;
    return {
      project_id: p.id as string & tags.Format<"uuid">,
      project_name: p.name,
      budget_hours: p.budget,
      actual_hours: actualHours,
      timelog_count: totalTimelogs satisfies number as number,
      utilization_percentage: utilizationPercentage,
    } satisfies IHrmPlatformProjectBudgetReport.ISummary;
  });
  const page = Math.max(props.body.page ?? 0, 0);
  return {
    pagination: {
      current: (page + 1) satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmPlatformProjectBudgetReport.ISummary;
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
// import { IHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetReport";
// import { IPageIHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectBudgetReport";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberReportsProjectBudget(props: {
//   member: MemberPayload;
//   body: IHrmPlatformProjectBudgetReport.IRequest;
// }): Promise<IPageIHrmPlatformProjectBudgetReport.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------