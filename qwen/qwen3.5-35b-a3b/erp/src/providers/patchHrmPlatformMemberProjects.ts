import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectAtSummaryTransformer } from "../transformers/HrmPlatformProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjects(props: {
  member: MemberPayload;
  body: IHrmPlatformProject.IRequest;
}): Promise<IPageIHrmPlatformProject.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch member to get context
  const member = await MyGlobal.prisma.hrm_platform_members.findUniqueOrThrow({
    where: { id: props.member.id },
    select: { deleted_at: true },
  });
  // Validate member is not deleted
  if (member.deleted_at !== null) {
    throw new HttpException("You are not enrolled", 403);
  }
  // Build where clause
  const whereInput: Prisma.hrm_platform_projectsWhereInput = {
    deleted_at: null,
  };
  // Add status filter
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  // Add name search (substring match)
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search !== ""
  ) {
    whereInput.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Add start date range filter
  if (
    props.body.start_date_range !== undefined &&
    props.body.start_date_range !== null
  ) {
    whereInput.start_date = {
      gte: props.body.start_date_range.gte,
      lte: props.body.start_date_range.lte,
    };
  }
  // Add end date range filter
  if (
    props.body.end_date_range !== undefined &&
    props.body.end_date_range !== null
  ) {
    whereInput.end_date = {
      gte: props.body.end_date_range.gte,
      lte: props.body.end_date_range.lte,
    };
  }
  // Add has_budget filter
  if (props.body.has_budget !== undefined && props.body.has_budget !== null) {
    if (props.body.has_budget === true) {
      whereInput.budget_hours = {
        not: null,
      };
    } else {
      whereInput.budget_hours = null;
    }
  }
  // Build orderBy
  const orderByInput: Prisma.hrm_platform_projectsOrderByWithRelationInput[] =
    [];
  switch (props.body.sort_by) {
    case "created_at":
      orderByInput.push({
        created_at: props.body.sort_order ?? "desc",
      });
      break;
    case "name":
      orderByInput.push({
        name: props.body.sort_order ?? "asc",
      });
      break;
    case "status":
      orderByInput.push({
        status: props.body.sort_order ?? "asc",
      });
      break;
    case "start_date":
      orderByInput.push({
        start_date: props.body.sort_order ?? "asc",
      });
      break;
    default:
      orderByInput.push({
        created_at: "desc",
      });
      break;
  }
  // Query projects
  const records = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...HrmPlatformProjectAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.hrm_platform_projects.count({
    where: whereInput,
  });
  // Calculate pagination metadata
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformProjectAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmPlatformProject.ISummary;
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
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberProjects(props: {
//   member: MemberPayload;
//   body: IHrmPlatformProject.IRequest;
// }): Promise<IPageIHrmPlatformProject.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_projects.findMany({
//     ...HrmPlatformProjectAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformProjectAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------