import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingProjectAtSummaryTransformer } from "../transformers/HrmTimeTrackingProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberProjects(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingProject.IRequest;
}): Promise<IPageIHrmTimeTrackingProject.ISummary> {
  // Resolve member's organization context via active employee record
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      status: "active",
      deleted_at: null,
    },
    select: {
      hrm_time_tracking_organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("No active employee record found", 403);
  }
  const organizationId = employee.hrm_time_tracking_organization_id;
  // Build filter conditions
  const conditions: Prisma.hrm_time_tracking_projectsWhereInput[] = [
    { hrm_time_tracking_organization_id: organizationId },
    { deleted_at: null },
  ];
  // search / name — both target the name field with partial match
  if (props.body.search !== undefined) {
    conditions.push({
      name: { contains: props.body.search, mode: "insensitive" },
    });
  } else if (props.body.name !== undefined) {
    conditions.push({
      name: { contains: props.body.name, mode: "insensitive" },
    });
  }
  // status filter (single value or array)
  if (props.body.status !== undefined) {
    if (Array.isArray(props.body.status)) {
      conditions.push({ status: { in: props.body.status } });
    } else {
      conditions.push({ status: props.body.status });
    }
  }
  // colorCode exact match
  if (props.body.colorCode !== undefined) {
    conditions.push({ color_code: props.body.colorCode });
  }
  // startedAt date range
  if (props.body.startedAtRange !== undefined) {
    const startedFilter: Prisma.DateTimeFilter = {};
    if (props.body.startedAtRange.gte !== undefined) {
      startedFilter.gte = new Date(props.body.startedAtRange.gte);
    }
    if (props.body.startedAtRange.lte !== undefined) {
      startedFilter.lte = new Date(props.body.startedAtRange.lte);
    }
    conditions.push({ started_at: startedFilter });
  }
  // endedAt date range
  if (props.body.endedAtRange !== undefined) {
    const endedFilter: Prisma.DateTimeFilter = {};
    if (props.body.endedAtRange.gte !== undefined) {
      endedFilter.gte = new Date(props.body.endedAtRange.gte);
    }
    if (props.body.endedAtRange.lte !== undefined) {
      endedFilter.lte = new Date(props.body.endedAtRange.lte);
    }
    conditions.push({ ended_at: endedFilter });
  }
  // budgetHours numeric range
  if (props.body.budgetHoursRange !== undefined) {
    const budgetFilter: Prisma.FloatFilter = {};
    if (props.body.budgetHoursRange.gte !== undefined) {
      budgetFilter.gte = props.body.budgetHoursRange.gte;
    }
    if (props.body.budgetHoursRange.lte !== undefined) {
      budgetFilter.lte = props.body.budgetHoursRange.lte;
    }
    conditions.push({ budget_hours: budgetFilter });
  }
  const where: Prisma.hrm_time_tracking_projectsWhereInput = {
    AND: conditions,
  };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Sorting
  let orderBy: Prisma.hrm_time_tracking_projectsOrderByWithRelationInput = {
    created_at: "desc",
  };
  if (props.body.sort !== undefined) {
    const sortField = props.body.sort.startsWith("-")
      ? props.body.sort.substring(1)
      : props.body.sort;
    const sortDirection = props.body.sort.startsWith("-")
      ? ("desc" as const)
      : ("asc" as const);
    const validSortFields: Record<
      string,
      Prisma.hrm_time_tracking_projectsOrderByWithRelationInput
    > = {
      name: { name: sortDirection },
      status: { status: sortDirection },
      created_at: { created_at: sortDirection },
      started_at: { started_at: sortDirection },
      ended_at: { ended_at: sortDirection },
      budget_hours: { budget_hours: sortDirection },
    };
    if (validSortFields[sortField] !== undefined) {
      orderBy = validSortFields[sortField];
    }
  }
  // Sequential queries — count first, then findMany
  const total = await MyGlobal.prisma.hrm_time_tracking_projects.count({
    where,
  });
  const records =
    total > 0
      ? await MyGlobal.prisma.hrm_time_tracking_projects.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          ...HrmTimeTrackingProjectAtSummaryTransformer.select(),
        })
      : [];
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingProjectAtSummaryTransformer.transform,
    ),
  };
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
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IPageIHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProject";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberProjects(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingProject.IRequest;
// }): Promise<IPageIHrmTimeTrackingProject.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_projects.findMany({
//     ...HrmTimeTrackingProjectAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingProjectAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------