import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member: { id: props.member.id },
      deleted_at: null,
    },
    select: {
      hrm_platform_organization_id: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });
  if (employee === null) {
    return {
      pagination: { current: 1, limit: 20, records: 0, pages: 0 },
      data: [],
    };
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    hrm_platform_organization_id: employee.hrm_platform_organization_id,
    deleted_at: null,
    ...(props.body.status !== undefined &&
      props.body.status !== null &&
      props.body.status.length > 0 && {
        status: props.body.status,
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null &&
      props.body.search.length > 0 && {
        OR: [
          { name: { contains: props.body.search } },
          { description: { contains: props.body.search } },
        ],
      }),
  } satisfies Prisma.hrm_platform_projectsWhereInput;
  const orderByInput = (() => {
    if (
      props.body.sort === undefined ||
      props.body.sort === null ||
      props.body.sort.length === 0
    ) {
      return { created_at: "desc" as const };
    }
    const parts = props.body.sort.split(" ");
    const field = parts[0];
    const direction =
      parts.length > 1 && parts[1].toUpperCase() === "ASC"
        ? ("asc" as const)
        : ("desc" as const);
    switch (field) {
      case "updated_at":
        return { updated_at: direction };
      case "name":
        return { name: direction };
      case "status":
        return { status: direction };
      case "start_date":
        return { start_date: direction };
      case "end_date":
        return { end_date: direction };
      case "created_at":
      default:
        return { created_at: direction };
    }
  })() satisfies Prisma.hrm_platform_projectsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformProjectAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_projects.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformProjectAtSummaryTransformer.transform,
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
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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