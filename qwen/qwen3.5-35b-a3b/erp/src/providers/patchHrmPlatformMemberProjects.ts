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
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      expired_at: { gt: new Date() },
      hrm_platform_member_id: props.member.id,
    },
  });
  if (session === null) {
    throw new HttpException("Unauthorized", 401);
  }
  const organizationId = session.organization_id;
  if (organizationId === null) {
    throw new HttpException("Organization context not set", 404);
  }
  const where: Prisma.hrm_platform_projectsWhereInput = {
    organization_id: organizationId,
    deleted_at: null,
  };
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search !== ""
  ) {
    where.name = { contains: props.body.search };
  }
  if (props.body.status !== undefined && props.body.status !== null) {
    where.status = props.body.status;
  }
  if (props.body.has_budget !== undefined && props.body.has_budget !== null) {
    if (props.body.has_budget) {
      where.budget_hours = { not: null };
    } else {
      where.budget_hours = null;
    }
  }
  if (
    props.body.start_date_range !== undefined &&
    props.body.start_date_range !== null
  ) {
    const startDateRange = props.body.start_date_range;
    where.start_date = {
      gte: startDateRange.gte ?? undefined,
      lte: startDateRange.lte ?? undefined,
    };
  }
  if (
    props.body.end_date_range !== undefined &&
    props.body.end_date_range !== null
  ) {
    const endDateRange = props.body.end_date_range;
    where.end_date = {
      gte: endDateRange.gte ?? undefined,
      lte: endDateRange.lte ?? undefined,
    };
  }
  const sort_by = props.body.sort_by ?? "created_at";
  const sort_order = props.body.sort_order ?? "desc";
  const orderBy: Array<Prisma.hrm_platform_projectsOrderByWithRelationInput> =
    [];
  if (sort_by === "created_at") {
    orderBy.push({ created_at: sort_order });
  } else if (sort_by === "name") {
    orderBy.push({ name: sort_order });
  } else if (sort_by === "status") {
    orderBy.push({ status: sort_order });
  } else if (sort_by === "start_date") {
    orderBy.push({ start_date: sort_order });
  }
  const total = await MyGlobal.prisma.hrm_platform_projects.count({
    where,
  });
  const records = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...HrmPlatformProjectAtSummaryTransformer.select(),
  });
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
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