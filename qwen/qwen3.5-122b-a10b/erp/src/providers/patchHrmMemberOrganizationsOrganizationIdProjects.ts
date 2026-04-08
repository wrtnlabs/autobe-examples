import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmProjectAtSummaryTransformer } from "../transformers/HrmProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberOrganizationsOrganizationIdProjects(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmProject.IRequest;
}): Promise<IPageIHrmProject.ISummary> {
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_projectsWhereInput = {
    hrm_organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search } },
        { description: { contains: props.body.search } },
      ],
    }),
    ...(props.body.start_date_from && {
      start_date: { gte: new Date(props.body.start_date_from) },
    }),
    ...(props.body.start_date_to && {
      start_date: { lte: new Date(props.body.start_date_to) },
    }),
    ...(props.body.end_date_from && {
      end_date: { gte: new Date(props.body.end_date_from) },
    }),
    ...(props.body.end_date_to && {
      end_date: { lte: new Date(props.body.end_date_to) },
    }),
  };
  const orderByInput: Prisma.hrm_projectsOrderByWithRelationInput = {
    [props.body.sort_by ?? "created_at"]: props.body.sort_order ?? "desc",
  };
  const total = await MyGlobal.prisma.hrm_projects.count({
    where: whereInput,
  });
  const records = await MyGlobal.prisma.hrm_projects.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...HrmProjectAtSummaryTransformer.select(),
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
      HrmProjectAtSummaryTransformer.transform,
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
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IPageIHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmProject";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberOrganizationsOrganizationIdProjects(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmProject.IRequest;
// }): Promise<IPageIHrmProject.ISummary> {
//   const records = await MyGlobal.prisma.hrm_projects.findMany({
//     ...HrmProjectAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmProjectAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------